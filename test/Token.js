const { ethers } = require('hardhat');
const { expect } = require('chai');

const tokenSup = (n) => {
    return ethers.utils.parseUnits(n.toString(),'ether');
}

describe('Token', () => {
    let token, accounts, deployer, receiver, exchange;

    beforeEach(async () => {
        //Fetch token from blockchain
        const Token = await ethers.getContractFactory('Token');
        token = await Token.deploy("HIT Token", "HIT", "1000000");

        accounts = await ethers.getSigners();
        deployer = accounts[0];
        receiver = accounts[1];
        exchange = accounts[2];
    })

    describe('Deployment', () => {

        const name = 'HIT Token';
        const symbol = 'HIT';
        const decimal = '18';
        const totalSupply = '1000000';

        it('has a correct name', async () => {
        //Check that the name is correct
        expect(await token.name()).to.equal(name);
        })

        it('has a correct symbol', async () => {
            //Check that the symbol is correct
            expect(await token.symbol()).to.equal(symbol);
        })

        it('has a correct decimals', async () => {
            //Check that the decimals are correct
            expect(await token.decimals()).to.equal(decimal);
        })

        it('has a correct total supply', async () => {
            //Check that the total supply is correct
            expect(await token.totalSupply()).to.equal(tokenSup(totalSupply));
        })

        it('assigns total supply to deployer', async () => {
            //Check that the total supply is correct
            expect(await token.balanceOf(deployer.address)).to.equal(tokenSup(totalSupply));
        })
    })

    describe('Sending Token', () => { 

        describe('Success', () => {
            let amount, transaction, result;

            beforeEach(async () => {
                amount = tokenSup(100);
                transaction = await token.connect(deployer).transfer(receiver.address, amount);
                result = await transaction.wait();
            })

            it('transfers token balances', async () => {
                expect(await token.balanceOf(deployer.address)).to.equal(tokenSup(999900));
                expect(await token.balanceOf(receiver.address)).to.equal(amount);
            })

            it('emits an Transfer event', async () =>{
                const event = result.events[0];
                expect(event.event).to.equal('Transfer');

                const args = event.args;
                expect(args.from).to.equal(deployer.address);
                expect(args.to).to.equal(receiver.address);
                expect(args.value).to.equal(amount);
            })
        })

        describe('Failure', () => { 

            it('rejects insufficient balances', async () =>{
                const invalidAmount = tokenSup(100000000);
                await expect (token.connect(deployer).transfer(receiver.address, invalidAmount)).to.be.reverted;
            })

            it('rejects invalid recipient', async () =>{
                const amount = tokenSup(100);
                await expect (token.connect(deployer).transfer('0x0000000000000000000000000000000000000000', amount)).to.be.reverted;
            })
            
        })
    })

    describe('Approving Tokens', () => {

        let amount, transaction, result;

            beforeEach(async () => {
                amount = tokenSup(100);
                transaction = await token.connect(deployer).approve(exchange.address, amount);
                result = await transaction.wait();
            })
        describe('Success', () => {
            it('allocates an allowance for delegated token spending', async () => {
                expect(await token.allowance(deployer.address, exchange.address)).to.equal(amount);
            })

            it('emits an Approval event', async () =>{
                const event = result.events[0];
                expect(event.event).to.equal('Approval');

                const args = event.args;
                expect(args.owner).to.equal(deployer.address);
                expect(args.spender).to.equal(exchange.address);
                expect(args.value).to.equal(amount);
            })
        })

        describe('Failure', () => {
            it('rejects invalid spenders', async () => {
                const amount = tokenSup(100);
                await expect (token.connect(deployer).approve('0x0000000000000000000000000000000000000000', amount)).to.be.reverted;
            })
        })
    })

    describe('Delegated Token Transfers', () => { 

        let amount, transaction, result;

            beforeEach(async () => {
                amount = tokenSup(100);
                transaction = await token.connect(deployer).approve(exchange.address, amount);
                result = await transaction.wait();
            })

        describe('Success', () => { 
            beforeEach(async () => {
                transaction = await token.connect(exchange).transferFrom(deployer.address, receiver.address, amount);
                result = await transaction.wait();
            })

            it('transfers token balances', async () => {
                expect(await token.balanceOf(deployer.address)).to.equal(ethers.utils.parseUnits('999900','ether'));
                expect(await token.balanceOf(receiver.address)).to.equal(amount);
            })

            it('resets the allowance', async () => {
                expect(await token.allowance(deployer.address, exchange.address)).to.be.equal(0);
            })

            it('emits an Transfer event', async () =>{
                const event = result.events[0];
                expect(event.event).to.equal('Transfer');

                const args = event.args;
                expect(args.from).to.equal(deployer.address);
                expect(args.to).to.equal(receiver.address);
                expect(args.value).to.equal(amount);
            })
         })

        describe('Failure', () => { 
            //Attempt to transfer too many tokens
            it('Rejects insufficient amounts', async () => {
		        const invalidAmount = tokenSup(100000000)
		        await expect(token.connect(exchange).transferFrom(deployer.address, receiver.address, invalidAmount)).to.be.reverted;
	        })
         })
        
     })
})