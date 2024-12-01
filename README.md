#Projeto de Blockchain

#Iniciar blockchain
cd fabric-samples/test-network
./network.sh down
./network.sh up createChannel -c mychannel -ca
./network.sh deployCC -ccn basic -ccp ../asset-transfer-basic/chaincode-javascript/ -ccl javascript

#VScode:
#Abrir a pasta hyperledger/fabric-samples/asset-transfer-basic/application-javascript
#Abrir o terminal do VScode
sudo su
npm install
npm install express
node app.js

#Sempre que terminar de usar a blockchain use o ./network.sh down dentro do terminal da pasta BlockChainRedes 
#No terminal do VScode use o comando: rm -rf wallet
