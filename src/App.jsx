import React, { useState } from 'react';
import { Button, TextField, Typography, Paper, Grid, Box, CircularProgress, Link } from '@mui/material';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Keypair, SorobanRpc, TransactionBuilder, Asset, Operation, LiquidityPoolAsset, getLiquidityPoolId, BASE_FEE, Networks } from '@stellar/stellar-sdk';
import { Wallet, Droplets, ArrowDownCircle } from 'lucide-react';

const server = new SorobanRpc.Server('https://soroban-testnet.stellar.org');

const App = () => {
  const [keypair, setKeypair] = useState(null);
  const [log, setLog] = useState('');
  const [liquidityPoolId, setLiquidityPoolId] = useState('');
  const [assetName, setAssetName] = useState('');
  const [tokenAAmount, setTokenAAmount] = useState('');
  const [tokenBAmount, setTokenBAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [loading, setLoading] = useState({
    generateKeypair: false,
    fundAccount: false,
    createLiquidityPool: false,
    withdrawFromPool: false
  });

  const addLog = (message) => {
    setLog(message);
    toast.info(message);
  };

  const generateKeypair = () => {
    setLoading(prev => ({ ...prev, generateKeypair: true }));
    const newKeypair = Keypair.random();
    setKeypair(newKeypair);
    addLog(`Generated new keypair. Public key: ${newKeypair.publicKey()}`);
    setLoading(prev => ({ ...prev, generateKeypair: false }));
  };

  const fundAccount = async () => {
    if (!keypair) {
      toast.error('Please generate a keypair first.');
      return;
    }

    setLoading(prev => ({ ...prev, fundAccount: true }));
    const friendbotUrl = `https://friendbot.stellar.org?addr=${keypair.publicKey()}`;
    try {
      const response = await fetch(friendbotUrl);
      if (response.ok) {
        toast.success(`Account ${keypair.publicKey()} successfully funded.`);
      } else {
        toast.error(`Something went wrong funding account: ${keypair.publicKey()}.`);
      }
    } catch (error) {
      toast.error(`Error funding account ${keypair.publicKey()}: ${error.message}`);
    }
    setLoading(prev => ({ ...prev, fundAccount: false }));
  };

  const createLiquidityPool = async () => {
    if (!keypair || !assetName || !tokenAAmount || !tokenBAmount) {
      toast.error('Please ensure you have a keypair, asset name, and token amounts.');
      return;
    }

    setLoading(prev => ({ ...prev, createLiquidityPool: true }));
    try {
      const account = await server.getAccount(keypair.publicKey());
      const customAsset = new Asset(assetName, keypair.publicKey());
      const lpAsset = new LiquidityPoolAsset(Asset.native(), customAsset, 30);
      const lpId = getLiquidityPoolId('constant_product', lpAsset).toString('hex');
      setLiquidityPoolId(lpId);

      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET
      })
        .addOperation(Operation.changeTrust({ asset: lpAsset }))
        .addOperation(Operation.liquidityPoolDeposit({
          liquidityPoolId: lpId,
          maxAmountA: tokenAAmount,
          maxAmountB: tokenBAmount,
          minPrice: { n: 1, d: 1 },
          maxPrice: { n: 1, d: 1 }
        }))
        .setTimeout(30)
        .build();

      transaction.sign(keypair);
      const result = await server.sendTransaction(transaction);
      toast.success(<>Liquidity Pool created. <Link href={`https://stellar.expert/explorer/testnet/tx/${result.hash}`} target="_blank" rel="noopener noreferrer">View Transaction</Link></>);
    } catch (error) {
      toast.error(`Error creating Liquidity Pool: ${error.message}`);
    }
    setLoading(prev => ({ ...prev, createLiquidityPool: false }));
  };

  const withdrawFromPool = async () => {
    if (!keypair || !liquidityPoolId || !withdrawAmount) {
      toast.error('Please ensure you have a keypair, liquidity pool ID, and withdrawal amount.');
      return;
    }

    setLoading(prev => ({ ...prev, withdrawFromPool: true }));
    try {
      const account = await server.getAccount(keypair.publicKey());
      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET
      })
        .addOperation(Operation.liquidityPoolWithdraw({
          liquidityPoolId: liquidityPoolId,
          amount: withdrawAmount,
          minAmountA: '0',
          minAmountB: '0'
        }))
        .setTimeout(30)
        .build();

      transaction.sign(keypair);
      const result = await server.sendTransaction(transaction);
      toast.success(<>Withdrawal successful. <Link href={`https://stellar.expert/explorer/testnet/tx/${result.hash}`} target="_blank" rel="noopener noreferrer">View Transaction</Link></>);
    } catch (error) {
      toast.error(`Error withdrawing from Liquidity Pool: ${error.message}`);
    }
    setLoading(prev => ({ ...prev, withdrawFromPool: false }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 text-white flex flex-col items-center justify-center">
      <nav className="bg-slate-900 p-4 shadow-lg w-full">
        <div className="container mx-auto flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0">
          <div className="flex items-center justify-center w-full sm:w-auto">
            <Wallet className="text-blue-400 mr-2" size={32} />
            <Typography variant="h5" className="font-bold">
              LiquidityPro
            </Typography>
          </div>
          <div className="flex justify-center space-x-4 w-full sm:w-auto">
            <Button
              variant="outlined"
              onClick={generateKeypair}
              disabled={loading.generateKeypair}
              className="text-blue-400 border-blue-400 hover:bg-blue-400 hover:text-white w-40"
              startIcon={loading.generateKeypair ? <CircularProgress size={20} /> : null}
            >
              {loading.generateKeypair ? 'Generating...' : 'Generate Keypair'}
            </Button>
            <Button
              variant="contained"
              onClick={fundAccount}
              disabled={loading.fundAccount || !keypair}
              className="bg-blue-500 hover:bg-blue-600 w-40"
              startIcon={loading.fundAccount ? <CircularProgress size={20} /> : null}
            >
              {loading.fundAccount ? 'Funding...' : 'Fund Account'}
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Grid container spacing={4} justifyContent="center">
          <Grid item xs={12} md={6}>
            <Paper elevation={3} className="p-6 rounded-lg bg-slate-800 shadow-xl border border-slate-700 flex flex-col items-center">
              <div className="flex items-center justify-center mb-6">
                <Droplets className="text-blue-400 mr-2" size={24} />
                <Typography variant="h5" className="font-bold">
                  Create Liquidity Pool
                </Typography>
              </div>
              <TextField
                label="Asset Name"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                fullWidth
                margin="normal"
                variant="outlined"
                className="mb-4"
                InputLabelProps={{ className: "text-slate-300" }}
                InputProps={{ className: "text-white bg-slate-700" }}
              />
              <div className="grid grid-cols-2 gap-4 mb-4 w-full">
                <TextField
                  label="Token A Amount (XLM)"
                  value={tokenAAmount}
                  onChange={(e) => setTokenAAmount(e.target.value)}
                  fullWidth
                  type="number"
                  variant="outlined"
                  InputLabelProps={{ className: "text-slate-300" }}
                  InputProps={{ className: "text-white bg-slate-700" }}
                />
                <TextField
                  label="Token B Amount (Custom)"
                  value={tokenBAmount}
                  onChange={(e) => setTokenBAmount(e.target.value)}
                  fullWidth
                  type="number"
                  variant="outlined"
                  InputLabelProps={{ className: "text-slate-300" }}
                  InputProps={{ className: "text-white bg-slate-700" }}
                />
              </div>
              <Button
                variant="contained"
                onClick={createLiquidityPool}
                fullWidth
                disabled={loading.createLiquidityPool}
                className="mt-4 bg-blue-500 hover:bg-blue-600"
                startIcon={loading.createLiquidityPool ? <CircularProgress size={24} /> : null}
              >
                {loading.createLiquidityPool ? 'Creating...' : 'Create Liquidity Pool'}
              </Button>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper elevation={3} className="p-6 rounded-lg bg-slate-800 shadow-xl border border-slate-700">
              <div className="flex items-center justify-center mb-6">
                <ArrowDownCircle className="text-blue-400 mr-2" size={24} />
                <Typography variant="h5" className="font-bold">
                  Withdraw from Pool
                </Typography>
              </div>
              <TextField
                label="Liquidity Pool ID"
                value={liquidityPoolId}
                onChange={(e) => setLiquidityPoolId(e.target.value)}
                fullWidth
                margin="normal"
                variant="outlined"
                className="mb-4"
                InputLabelProps={{ className: "text-slate-300" }}
                InputProps={{ className: "text-white bg-slate-700" }}
              />
              <TextField
                label="Withdraw Amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                fullWidth
                margin="normal"
                type="number"
                variant="outlined"
                className="mb-4"
                InputLabelProps={{ className: "text-slate-300" }}
                InputProps={{ className: "text-white bg-slate-700" }}
              />
              <Button
                variant="contained"
                onClick={withdrawFromPool}
                fullWidth
                disabled={loading.withdrawFromPool}
                className="mt-4 bg-blue-500 hover:bg-blue-600"
                startIcon={loading.withdrawFromPool ? <CircularProgress size={24} /> : null}
              >
                {loading.withdrawFromPool ? 'Withdrawing...' : 'Withdraw from Pool'}
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </main>
      <ToastContainer theme="dark" />
    </div>
  );
};

export default App;