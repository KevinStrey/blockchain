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
                evidenceType: '🧬 Biológica',
                description: 'Amostra de sangue coletada na cena do crime',
                collectionLocation: 'Sala de estar - Rua das Flores, 123',
                collectionDatetime: '2024-01-15T11:30:00-03:00',
                collectorAgent: 'Perito Leandro (ID 001)',
                evidenceCondition: 'Íntegra',
                storageLocation: '🧊 Geladeira Forense',
                evidenceStatus: 'Em análise',
                sealNumber: 'SEAL001',
                sealType: 'Plástico',
                sealState: 'Íntegro',
                additionalNotes: 'Amostra coletada com luvas estéreis',
                custodian: 'Dr.ª Souza',
                evidenceHashes: [],
            },
            {
                id: 'item2',
                evidenceType: '🖐️ Impressão digital',
                description: 'Impressão digital encontrada na janela',
                collectionLocation: 'Janela lateral - Rua das Flores, 123',
                collectionDatetime: '2024-01-15T12:45:00-03:00',
                collectorAgent: 'Oficial Silva (ID 006)',
                evidenceCondition: 'Íntegra',
                storageLocation: '🏢 Depósito Central',
                evidenceStatus: 'Arquivada',
                sealNumber: 'SEAL002',
                sealType: 'Adesivo',
                sealState: 'Íntegro',
                additionalNotes: 'Coletada com fita adesiva especial',
                custodian: 'Oficial Silva',
                evidenceHashes: [],
            },
            {
                id: 'item3',
                evidenceType: '🧬 DNA',
                description: 'Amostra de DNA extraída de cabelo',
                collectionLocation: 'Quarto principal - Rua das Flores, 123',
                collectionDatetime: '2024-01-15T13:20:00-03:00',
                collectorAgent: 'Perito Gerson (ID 002)',
                evidenceCondition: 'Íntegra',
                storageLocation: '🧪 Laboratório de Biologia',
                evidenceStatus: 'Em análise',
                sealNumber: 'SEAL003',
                sealType: 'Numerado',
                sealState: 'Íntegro',
                additionalNotes: 'Amostra enviada para análise genética',
                custodian: 'Técnico Lima',
                evidenceHashes: [],
            },
            {
                id: 'item4',
                evidenceType: '🔫 Balística',
                description: 'Arma de fogo apreendida no local',
                collectionLocation: 'Cozinha - Rua das Flores, 123',
                collectionDatetime: '2024-01-15T14:10:00-03:00',
                collectorAgent: 'Agente Primm (ID 004)',
                evidenceCondition: 'Íntegra',
                storageLocation: '🔒 Cofre',
                evidenceStatus: 'Arquivada',
                sealNumber: 'SEAL004',
                sealType: 'Metálico',
                sealState: 'Íntegro',
                additionalNotes: 'Arma descarregada e lacrada',
                custodian: 'Detetive Souza',
                evidenceHashes: [],
            },
            {
                id: 'item5',
                evidenceType: '📷 Imagem/Vídeo',
                description: 'Vídeo de vigilância da cena do crime',
                collectionLocation: 'Sistema de CFTV - Rua das Flores, 123',
                collectionDatetime: '2024-01-15T15:00:00-03:00',
                collectorAgent: 'Agente Luiz (ID 005)',
                evidenceCondition: 'Íntegra',
                storageLocation: '💻 Laboratório de Digital',
                evidenceStatus: 'Em análise',
                sealNumber: 'SEAL005',
                sealType: 'RFID',
                sealState: 'Íntegro',
                additionalNotes: 'Backup realizado em múltiplos dispositivos',
                custodian: 'Agente Dumes',
                evidenceHashes: [],
            },
            {
                id: 'item6',
                evidenceType: '📄 Documental',
                description: 'Documentos encontrados na cena',
                collectionLocation: 'Escritório - Rua das Flores, 123',
                collectionDatetime: '2024-01-15T16:30:00-03:00',
                collectorAgent: 'Perito Maurício (ID 003)',
                evidenceCondition: 'Íntegra',
                storageLocation: '📦 Arquivo Morto',
                evidenceStatus: 'Arquivada',
                sealNumber: 'SEAL006',
                sealType: 'Barra de segurança',
                sealState: 'Íntegro',
                additionalNotes: 'Documentos digitalizados e originais preservados',
                custodian: 'Analista Figueira',
                evidenceHashes: [],
            },
        ];

        for (const asset of assets) {
            asset.docType = 'forensicItem';
            await ctx.stub.putState(asset.id, Buffer.from(stringify(sortKeysRecursive(asset))));
            await this.createTransferRecord(ctx, asset.id, asset.custodian, 'InitLedger');
        }
    }

    // Adiciona um novo ativo ao ledger com o novo modelo de evidência.
    async AddItem(ctx, id, evidenceType, description, collectionLocation, collectionDatetime, collectorAgent, evidenceCondition, storageLocation, evidenceStatus, sealNumber, sealType, sealState, additionalNotes) {
        const exists = await this.itemExists(ctx, id);
        if (exists) {
            throw new Error(`Item ${id} already exists`);
        }

        const asset = {
            id,
            evidenceType,
            description,
            collectionLocation,
            collectionDatetime,
            collectorAgent,
            evidenceCondition,
            storageLocation,
            evidenceStatus,
            sealNumber,
            sealType,
            sealState,
            additionalNotes,
            custodian: collectorAgent, // O custodiante inicial é o agente coletor
            evidenceHashes: [],
        };

        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
        await this.createTransferRecord(ctx, id, collectorAgent, 'AddItem');
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
        // Converte o timestamp para UTC-3 (horário de Brasília)
        const utcTimestamp = (await ctx.stub.getTxTimestamp()).seconds.low * 1000;
        const brasiliaDate = new Date(utcTimestamp - (3 * 60 * 60 * 1000)); // Subtrai 3 horas para UTC-3
        const timestamp = brasiliaDate.toISOString();
        
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
