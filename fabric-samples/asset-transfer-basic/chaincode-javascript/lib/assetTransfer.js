/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

// Deterministic JSON.stringify()
const stringify = require('json-stringify-deterministic');
const sortKeysRecursive = require('sort-keys-recursive');
const { Contract } = require('fabric-contract-api');

class AssetTransfer extends Contract {

    //Inicializa o ledger com um conjunto de ativos pré-definidos.
    async InitLedger(ctx) {
        const assets = [
            {
                id: 'item1',
                description: 'Amostra de Sangue',
                quantity: 1,
                custodian: 'Dr.ª Souza',
                value: 300,
            },
            {
                id: 'item2',
                description: 'Impressão digital',
                quantity: 1,
                custodian: 'Oficial Silva',
                value: 400,
            },
            {
                id: 'item3',
                description: 'DNA',
                quantity: 2,
                custodian: 'Técnico Lima',
                value: 500,
            },
            {
                id: 'item4',
                description: 'Arma de fogo',
                quantity: 1,
                custodian: 'Detetive Souza',
                value: 650,
            },
            {
                id: 'item5',
                description: 'Vídeo de vigilância',
                quantity: 1,
                custodian: 'Agente Dumes',
                value: 700,
            },
            {
                id: 'item6',
                description: 'Documento',
                quantity: 3,
                custodian: 'Analista Figueira',
                value: 800,
            },
        ];

        for (const asset of assets) {
            asset.docType = 'forensicItem';
            await ctx.stub.putState(asset.id, Buffer.from(stringify(sortKeysRecursive(asset))));
            await this.createTransferRecord(ctx, asset.id, asset.custodian, 'InitLedger');
        }
    }

    // Adiciona um novo ativo ao ledger.
    async AddItem(ctx, id, description, quantity, custodian, value) {
        const exists = await this.itemExists(ctx, id);
        if (exists) {
            throw new Error(`Item ${id} already exists`);
        }

        const asset = {
            id,
            description,
            quantity,
            custodian,
            value,
            evidenceHashes: [],
        };

        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
        await this.createTransferRecord(ctx, id, custodian, 'AddItem');
        return JSON.stringify(asset);
    }

    // Transfere a custódia de um ativo de um custodiante para outro.
    async TransferCustody(ctx, id, newCustodian) {
        const itemString = await this.ReadIndividual(ctx, id);
        const item = JSON.parse(itemString);
        const oldCustodian = item.custodian;
        item.custodian = newCustodian;

        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(item))));
        await this.createTransferRecord(ctx, id, newCustodian, 'TransferCustody');
        return oldCustodian;
    }

    // Recupera os detalhes de um ativo específico.
    async ReadIndividual(ctx, id) {
        const itemJSON = await ctx.stub.getState(id);
        if (!itemJSON || itemJSON.length === 0) {
            throw new Error(`Item ${id} does not exist`);
        }
        return itemJSON.toString();
    }

    // Recupera uma lista de todos os ativos no ledger.
    async ReadAll(ctx) {
        const allResults = [];
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            if (!record.txId) {  // Filter only asset records (without TxID)
                allResults.push(record);
            }
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }
    
    // Recupera uma lista de todos os registros de transferência (ou seja, registros de transferência de custódia).
    async ReadCustodyRecords(ctx) {
        const allResults = [];
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            if (record.txId) {  // Filter only transfer records (with TxID)
                allResults.push(record);
            }
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }

    // Cria um novo registro de transferência quando a custódia de um ativo é transferida.
    async createTransferRecord(ctx, itemId, newCustodian, transactionType) {
        const timestamp = new Date((await ctx.stub.getTxTimestamp()).seconds.low * 1000).toISOString();
        const transferRecord = {
            itemId,
            custodian: newCustodian,
            transactionType,
            timestamp,
            txId: ctx.stub.getTxID()
        };
        const transferRecordId =`transfer_${itemId}_${ctx.stub.getTxID()}`;
        await ctx.stub.putState(transferRecordId, Buffer.from(stringify(sortKeysRecursive(transferRecord))));
    }

    // Verifica se um ativo com um ID específico existe no ledger.
    async itemExists(ctx, id) {
        const itemJSON = await ctx.stub.getState(id);
        return itemJSON && itemJSON.length > 0;
    }

    // Adiciona um novo hash de evidência ao asset
    async AddEvidenceHash(ctx, id, hash) {
        const itemString = await this.ReadIndividual(ctx, id);
        const item = JSON.parse(itemString);
        if (!item.evidenceHashes) {
            item.evidenceHashes = [];
        }
        item.evidenceHashes.push(hash);
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(item))));
        return JSON.stringify(item);
    }
}

module.exports = AssetTransfer;
