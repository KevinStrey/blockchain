# Projeto de Blockchain

## Como rodar a Blockchain: [https://youtu.be/tJyyhH30OMQ](https://youtu.be/tJyyhH30OMQ)
## Apresentaçao do App: [https://youtu.be/tJyyhH30OMQ](https://youtu.be/17p6xxu0J-Q)

## Iniciar a Blockchain
1. Acesse o diretório da rede de teste:
   ```bash
   cd fabric-samples/test-network
   ./network.sh down
   ./network.sh up createChannel -c mychannel -ca
   ./network.sh deployCC -ccn basic -ccp ../asset-transfer-basic/chaincode-javascript/ -ccl javascript
   ```

## Configuração no VSCode:
2. Abrir a pasta 
```bash
hyperledger/fabric-samples/asset-transfer-basic/application-javascript
```

3. Abrir o terminal do VScode
  ```bash
  sudo su
  npm install
  npm install express
  node app.js
  ```


4. Sempre que terminar de usar a blockchain use o ```bash./network.sh down``` dentro do terminal da pasta BlockChainRedes 
5. No terminal do VScode use o comando: ```rm -rf wallet```
