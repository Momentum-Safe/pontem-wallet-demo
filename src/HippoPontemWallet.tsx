import React, {
  useEffect, useState, SyntheticEvent, useCallback,
} from 'react';
import { useWallet, WalletName } from '@manahippo/aptos-wallet-adapter';

import './styles.scss';
import { TAptosCreateTx } from './types';
import { camelCaseKeysToUnderscore } from './utils';
import {
  SendTransaction, Address, BasicModal, Hint,
} from './components';
import { localStorageKey } from './consts';

import { MSafe } from './MSafe';

export const HippoPontemWallet = () => {
  const {
    account,
    connected,
    wallets,
    wallet,
    connect,
    disconnect,
    select,
    signAndSubmitTransaction,
  } = useWallet();

  const [currentAdapterName, setAdapterName] = useState<string | undefined>(wallet?.adapter.name);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAddress, setCurrentAddress] = useState(account?.address);

  const onModalClose = () => setIsModalOpen(false);
  const onModalOpen = () => setIsModalOpen(true);

  const adapters = wallets.map((item) => ({
    name: item?.adapter.name,
    icon: item?.adapter.icon,
  }));

  const handleSendTransaction = async (tx: TAptosCreateTx) => {
    const payload = camelCaseKeysToUnderscore(tx.payload);
    try {
      const { hash } = await signAndSubmitTransaction(payload);
      return hash;
    } catch (e) {
      console.log(e);
    }
  };

  const handleConnect = useCallback(async (adapterName: string) => {
    if (adapterName) {
      try {
        await connect(adapterName);
      } catch (e) {
        console.log(e);
      }
    }
  }, [connect]);

  const handleAdapterClick = useCallback(async (event: SyntheticEvent<HTMLButtonElement>) => {
    const walletName = (event.currentTarget as HTMLButtonElement).getAttribute('data-value');

    try {
      if (walletName) {
        setAdapterName(walletName);
        await handleConnect(walletName);
        select(walletName as WalletName);
        onModalClose();
      }
    } catch (error) {
      console.log(error);
    }
  }, [disconnect, select, currentAdapterName]);

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnect();
    } catch (error) {
      console.log(error);
    }
    setAdapterName(undefined);
  }, [disconnect]);

  useEffect(() => {
    setCurrentAddress(account?.address);
  }, [account]);

  useEffect(() => {
    let alreadyConnectedWallet = localStorage.getItem(localStorageKey);
    if (alreadyConnectedWallet) {
      if (alreadyConnectedWallet.startsWith('"')) {
        alreadyConnectedWallet = JSON.parse(alreadyConnectedWallet) as string;
      }
      setAdapterName(alreadyConnectedWallet);
    }
  }, []);

  return (
    <div className="wallet">
      {!connected && <button className='w-button' onClick={onModalOpen}>Connect wallet</button>}
      {connected && <button className='w-button' onClick={handleDisconnect}>Disconnect wallet</button>}

      <Address walletName={currentAdapterName} address={currentAddress} />

      {connected && (
        <SendTransaction sender={currentAddress} onSendTransaction={handleSendTransaction} />
      )}

      { connected && (<MSafe />) }

      {!connected && <Hint hint={'connect wallet'}/>}

      <BasicModal
        adapters={adapters}
        isOpen={isModalOpen}
        handleClose={onModalClose}
        handleAdapterClick={handleAdapterClick}
      />
    </div>
  );
};
