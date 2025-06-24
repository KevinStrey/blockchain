/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const express = require('express');
const evidenceDB = require('./evidenceDB');
const multer = require('multer');
const crypto = require('crypto');

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const { buildCAClient, enrollAdmin, registerAndEnrollUser } = require('../../test-application/javascript/CAUtil.js');
const { buildCCPOrg1, buildWallet } = require('../../test-application/javascript/AppUtil.js');

//aqui ẽ feita a inicializacao da config da API
const app = express();
const port = 3000;

const channelName = process.env.CHANNEL_NAME || 'mychannel';
const chaincodeName = process.env.CHAINCODE_NAME || 'basic';

const mspOrg1 = 'Org1MSP';
const walletPath = path.join(__dirname, 'wallet');
const org1UserId = 'javascriptAppUser3';

const upload = multer();

app.use(express.static('public'));
app.use(express.json());

evidenceDB.initDB();

//comunicacao da servidor com a blockchain
async function getGateway() {
	const ccp = buildCCPOrg1();
	const wallet = await buildWallet(Wallets, walletPath);
	const gateway = new Gateway();
	await gateway.connect(ccp, {
		wallet,
		identity: org1UserId,
		discovery: { enabled: true, asLocalhost: true }
	});
	return gateway;
}

async function readAllAssets() {
	try {
		const gateway = await getGateway();
		const network = await gateway.getNetwork(channelName);
		const contract = network.getContract(chaincodeName);

		const result = await contract.evaluateTransaction('ReadAll');
		return JSON.parse(result.toString());
	} catch (error) {
		console.error(`Failed to evaluate transaction: ${error}`);
		throw error;
	}
}

async function readAllCustodyRecords() {
    try {
        const gateway = await getGateway();
        const network = await gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);

        const result = await contract.evaluateTransaction('ReadCustodyRecords');
        return JSON.parse(result.toString());
    } catch (error) {
        console.error(`Failed to evaluate transaction: ${error}`);
        throw error;
    }
}

async function readAsset(id) {
	const itemId = id;

	try {
		const gateway = await getGateway();
		const network = await gateway.getNetwork(channelName);
		const contract = network.getContract(chaincodeName);

		const result = await contract.evaluateTransaction('ReadIndividual', itemId);
		return JSON.parse(result.toString());
	} catch (error) {
		console.error(`Failed to evaluate transaction: ${error}`);
		throw error;
	}
}

async function addAsset(item) {
	const { 
		itemId, 
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
		additionalNotes 
	} = item;

	try {
		const gateway = await getGateway();
		const network = await gateway.getNetwork(channelName);
		const contract = network.getContract(chaincodeName);

		const result = await contract.submitTransaction('AddItem', itemId, evidenceType, description, collectionLocation, collectionDatetime, collectorAgent, evidenceCondition, storageLocation, evidenceStatus, sealNumber, sealType, sealState, additionalNotes);
		return JSON.parse(result.toString());
	} catch (error) {
		console.error(`Failed to evaluate transaction: ${error}`);
		throw error;
	}
}

async function transferAssetCustody(item) {
    const { itemId, novocustodian } = item;

    try {
        const gateway = await getGateway();
        const network = await gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);

        const result = await contract.submitTransaction('TransferCustody', itemId, novocustodian);
        return JSON.parse(result.toString());
    } catch (error) {
        console.error(`Failed to evaluate transaction: ${error}`);
        throw error;
    }
}

// Endpoint para listar todos os assets
app.get('/api/assets', async (req, res) => {
	try {
		const result = await readAllAssets();
		res.status(200).json(result);
	} catch (error) {
		res.status(500).json({ error: error.toString() });
	}
});

// Endpoint para listar todos os registros de custódia
app.get('/api/custodia', async (req, res) => {
    try {
        const result = await readAllCustodyRecords();
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.toString() });
    }
});

// Endpoint para obter um asset específico
app.get('/api/asset/:id', async (req, res) => {
	const itemId = req.params.id;

	try {
		const result = await readAsset(itemId);
		res.status(200).json(result);
	} catch (error) {
		res.status(500).json({ error: error.toString() });
	}
});

// Endpoint para adicionar um novo asset
app.post('/api/asset/transfer', async (req, res) => {
	const {
		itemId,
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
		additionalNotes
	} = req.body;

	// Validação simples dos campos obrigatórios
	if (!itemId || !evidenceType || !description || !collectionLocation || !collectionDatetime || !collectorAgent || !evidenceCondition || !storageLocation || !evidenceStatus) {
		return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
	}

	try {
		const result = await addAsset({
			itemId,
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
			additionalNotes
		});
		
		return res.status(200).json({
			message: '✅ Evidência adicionada com sucesso na blockchain!',
			item: result
		});
	} catch (error) {
		return res.status(500).json({ error: '❌ Erro ao adicionar evidência: ' + error.toString() });
	}
});

// Endpoint para transferir a custódia de um asset
app.post('/api/asset/transfer-custodia', async (req, res) => {
    const { itemId, novocustodian } = req.body;

    try {
        const result = await transferAssetCustody({ itemId, novocustodian });
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.toString() });
    }
});

// Rota para upload de evidência
app.post('/api/evidence/upload', upload.single('file'), async (req, res) => {
    const { assetId } = req.body;
    const file = req.file;
    if (!assetId || !file) {
        return res.status(400).json({ error: 'assetId e arquivo são obrigatórios.' });
    }
    // Gera hash do arquivo
    const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');
    evidenceDB.insertEvidence(assetId, file.originalname, file.mimetype, file.buffer, hash, async (err, id) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao salvar evidência.' });
        }
        // Chama o chaincode para registrar o hash no asset
        try {
            const gateway = await getGateway();
            const network = await gateway.getNetwork(channelName);
            const contract = network.getContract(chaincodeName);
            await contract.submitTransaction('AddEvidenceHash', assetId, hash);
        } catch (ccErr) {
            return res.status(500).json({ error: 'Evidência salva localmente, mas falha ao registrar hash na blockchain: ' + ccErr.toString() });
        }
        res.status(200).json({ message: 'Evidência salva com sucesso e hash registrado na blockchain.', id, hash });
    });
});

// Rota para listar evidências de um asset
app.get('/api/evidence/:assetId', (req, res) => {
    const { assetId } = req.params;
    evidenceDB.getEvidencesByAsset(assetId, (err, evidences) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar evidências.' });
        }
        res.status(200).json(evidences);
    });
});

// Rota para download de evidência por id
app.get('/api/evidence/file/:id', (req, res) => {
    const { id } = req.params;
    evidenceDB.getEvidenceFileById(id, (err, file) => {
        if (err || !file) {
            return res.status(404).json({ error: 'Arquivo não encontrado.' });
        }
        res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
        res.setHeader('Content-Type', file.mimetype);
        res.send(file.data);
    });
});

// Endpoint para consultar integridade das evidências de um asset
app.get('/api/integrity/:assetId', async (req, res) => {
    const assetId = req.params.assetId;
    // Buscar evidências locais
    evidenceDB.getEvidencesByAsset(assetId, async (err, localEvidences) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar evidências locais.' });
        }
        // Buscar asset na blockchain
        try {
            const gateway = await getGateway();
            const network = await gateway.getNetwork(channelName);
            const contract = network.getContract(chaincodeName);
            const assetResult = await contract.evaluateTransaction('ReadIndividual', assetId);
            const asset = JSON.parse(assetResult.toString());
            const blockchainHashes = asset.evidenceHashes || [];
            // Para cada evidência local, buscar o arquivo e recalcular o hash
            const results = await Promise.all(localEvidences.map(async (ev) => {
                return new Promise((resolve) => {
                    evidenceDB.getEvidenceFileById(ev.id, (err2, fileRow) => {
                        let hash = null;
                        if (!err2 && fileRow && fileRow.data) {
                            hash = crypto.createHash('sha256').update(fileRow.data).digest('hex');
                        }
                        resolve({
                            filename: ev.filename,
                            hash,
                            inBlockchain: hash ? blockchainHashes.includes(hash) : false,
                            createdAt: ev.createdAt
                        });
                    });
                });
            }));
            return res.status(200).json({ results, blockchainHashes });
        } catch (bcErr) {
            return res.status(500).json({ error: 'Erro ao buscar asset na blockchain: ' + bcErr.toString() });
        }
    });
});

// Endpoint para buscar evidências por ID (assetId)
app.get('/api/evidence/search/:assetId', (req, res) => {
    const { assetId } = req.params;
    evidenceDB.getEvidencesById(assetId, (err, evidences) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar evidências.' });
        }
        res.status(200).json(evidences);
    });
});

// Endpoint para listar todas as evidências
app.get('/api/evidence', (req, res) => {
    evidenceDB.getAllEvidences((err, evidences) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao listar evidências.' });
        }
        res.status(200).json(evidences);
    });
});

// Endpoint para buscar evidência por ID específico
app.get('/api/evidence/id/:id', (req, res) => {
    const { id } = req.params;
    evidenceDB.getEvidenceById(id, (err, evidence) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar evidência.' });
        }
        if (!evidence) {
            return res.status(404).json({ error: 'Evidência não encontrada.' });
        }
        res.status(200).json(evidence);
    });
});

/*app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});*/

app.listen(port, '0.0.0.0', () => {
    console.log(`App listening at http://0.0.0.0:${port}`);
});

/**
 *  A test application to show basic queries operations with any of the asset-transfer-basic chaincodes
 *   -- How to submit a transaction
 *   -- How to query and check the results
 *
 * To see the SDK workings, try setting the logging to show on the console before running
 *        export HFC_LOGGING='{"debug":"console"}'
 */
async function main() {
	try {
		// build an in memory object with the network configuration (also known as a connection profile)
		const ccp = buildCCPOrg1();

		// build an instance of the fabric ca services client based on
		// the information in the network configuration
		const caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');

		// setup the wallet to hold the credentials of the application user
		const wallet = await buildWallet(Wallets, walletPath);

		// in a real application this would be done on an administrative flow, and only once
		await enrollAdmin(caClient, wallet, mspOrg1);

		// in a real application this would be done only when a new user was required to be added
		// and would be part of an administrative flow
		await registerAndEnrollUser(caClient, wallet, mspOrg1, org1UserId, 'org1.department1');

		// Create a new gateway instance for interacting with the fabric network.
		// In a real application this would be done as the backend server session is setup for
		// a user that has been verified.
		const gateway = new Gateway();

		try {
			// setup the gateway instance
			// The user will now be able to create connections to the fabric network and be able to
			// submit transactions and query. All transactions submitted by this gateway will be
			// signed by this user using the credentials stored in the wallet.
			await gateway.connect(ccp, {
				wallet,
				identity: org1UserId,
				discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
			});

			// Build a network instance based on the channel where the smart contract is deployed
			const network = await gateway.getNetwork(channelName);

			// Get the contract from the network.
			const contract = network.getContract(chaincodeName);

			// Initialize a set of asset data on the channel using the chaincode 'InitLedger' function.
			// This type of transaction would only be run once by an application the first time it was started after it
			// deployed the first time. Any updates to the chaincode deployed later would likely not need to run
			// an "init" type function.
			console.log('\n--> Submit Transaction: InitLedger, function creates the initial set of assets on the ledger');
			await contract.submitTransaction('InitLedger');
			console.log('* Result: committed');
		} finally { }
	} catch (error) {
		console.error(`******** FAILED to run the application: ${error}`);
		process.exit(1);
	}
}


main();