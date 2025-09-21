'use client'

import React, { useState, useEffect } from 'react';
import { Users, RotateCcw, Trophy, Eye, EyeOff, Crown, Target } from 'lucide-react';

interface Player {
  id: number;
  name: string;
  balance: number;
  currentBet: number;
  hasActed: boolean;
  hasFolded: boolean;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  isAllIn: boolean;
}

type GamePhase = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

function Poker() {
  const [players, setPlayers] = useState<Player[]>([
    {
      id: 1,
      name: 'Pablo',
      balance: 500,
      currentBet: 0,
      hasActed: false,
      hasFolded: false,
      isDealer: false,
      isSmallBlind: false,
      isBigBlind: false,
      isAllIn: false,
    },
    {
      id: 2,
      name: 'Ruben',
      balance: 500,
      currentBet: 0,
      hasActed: false,
      hasFolded: false,
      isDealer: false,
      isSmallBlind: false,
      isBigBlind: false,
      isAllIn: false,
    },
  ]);

  const [currentPot, setCurrentPot] = useState(0);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [handNumber, setHandNumber] = useState(1);
  const [gamePhase, setGamePhase] = useState<GamePhase>('preflop');
  const [showBalances, setShowBalances] = useState(true);
  const [dealerIndex, setDealerIndex] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [lastAction, setLastAction] = useState('');
  const [customBetAmount, setCustomBetAmount] = useState('');
  const [winnerAnimation, setWinnerAnimation] = useState<{playerId: number, amount: number} | null>(null);

  const smallBlind = 5;
  const bigBlind = 10;
  const quickBetAmounts = [10, 20, 50, 100, 200];

  // Helper functions
  const getActivePlayers = () => players.filter(p => !p.hasFolded);
  const getCurrentPlayer = () => players[currentPlayerIndex];
  const getOpponent = () => players[currentPlayerIndex === 0 ? 1 : 0];
  const getMaxBet = () => Math.max(...players.map(p => p.currentBet));
  const getCallAmount = () => {
    const maxBet = getMaxBet();
    const currentPlayer = getCurrentPlayer();
    return Math.max(0, maxBet - currentPlayer.currentBet);
  };
  
  const getMinRaise = () => {
    const callAmount = getCallAmount();
    const maxBet = getMaxBet();
    // If no one has bet yet, minimum bet is $5
    if (maxBet === 0) return 5;
    // Otherwise, minimum raise is call amount + size of the current highest bet
    return callAmount + maxBet;
  };

  const getValidBetAmount = (amount: number) => {
    const currentPlayer = getCurrentPlayer();
    const callAmount = getCallAmount();
    const minRaise = getMinRaise();
    // If trying to bet less than call amount, just call
    if (amount <= callAmount) {
      return Math.min(callAmount, currentPlayer.balance);
    }
    // If trying to raise but less than minimum, make it minimum
    if (amount < minRaise) {
      return Math.min(minRaise, currentPlayer.balance);
    }
    // Otherwise, cap at balance
    return Math.min(amount, currentPlayer.balance);
  };

  const startNewHand = () => {
    setPlayers(prev => prev.map(player => ({
      ...player,
      currentBet: 0,
      hasActed: false,
      hasFolded: false,
      isDealer: false,
      isSmallBlind: false,
      isBigBlind: false,
      isAllIn: false,
    })));

    const numPlayers = players.length;
    const currentDealerIndex = dealerIndex;
    const smallBlindIndex = (currentDealerIndex + 1) % numPlayers;
    const bigBlindIndex = (currentDealerIndex + 2) % numPlayers;

    setPlayers(prev => prev.map((player, index) => ({
      ...player,
      isDealer: index === currentDealerIndex,
      isSmallBlind: index === smallBlindIndex,
      isBigBlind: index === bigBlindIndex,
    })));

    setLastAction('Blinds posting...');

    setTimeout(() => {
      setPlayers(prev => prev.map((player, index) => {
        if (index === smallBlindIndex) {
          const blindAmount = Math.min(smallBlind, player.balance);
          return { 
            ...player, 
            currentBet: blindAmount, 
            balance: player.balance - blindAmount,
            hasActed: player.balance <= smallBlind,
            isAllIn: player.balance <= smallBlind
          };
        }
        if (index === bigBlindIndex) {
          const blindAmount = Math.min(bigBlind, player.balance);
          return { 
            ...player, 
            currentBet: blindAmount, 
            balance: player.balance - blindAmount,
            hasActed: false,
            isAllIn: player.balance <= bigBlind
          };
        }
        return player;
      }));
      
      const smallBlindAmount = Math.min(smallBlind, players[smallBlindIndex].balance);
      const bigBlindAmount = Math.min(bigBlind, players[bigBlindIndex].balance);
      setCurrentPot(smallBlindAmount + bigBlindAmount);
      
      const firstToAct = numPlayers === 2 ? smallBlindIndex : (bigBlindIndex + 1) % numPlayers;
      setCurrentPlayerIndex(firstToAct);
      setLastAction(`Blinds: ${smallBlindAmount} (Small Blind), ${bigBlindAmount} (Big Blind)`);
    }, 800);

    setGamePhase('preflop');
    setGameStarted(true);
  };

  useEffect(() => {
    if (!gameStarted) {
      startNewHand();
    }
  }, [gameStarted]);

  // ⤵️ Auto-default the input value:
  // - If there is a bet to face (callAmount > 0) and opponent is not all-in → set to Min Raise
  // - Otherwise → set to 5 (table minimum bet)
  useEffect(() => {
    const me = getCurrentPlayer();
    const opp = getOpponent();
    const canAct =
      gamePhase !== 'showdown' && me && !me.hasFolded && !me.isAllIn;

    if (!canAct) return;

    if (opp && opp.isAllIn && !opp.hasFolded) {
      setCustomBetAmount(''); // only call/fold allowed
      return;
    }

    const maxBet = getMaxBet();
    if (maxBet === 0) {
      setCustomBetAmount('5');
    } else {
      const min = Math.min(getMinRaise(), me.balance);
      setCustomBetAmount(String(min));
    }
  }, [currentPlayerIndex, gamePhase, players, handNumber]);

  const handleAction = (actionType: string, amount: number = 0) => {
    const player = getCurrentPlayer();
    const opponent = getOpponent();
    const callAmount = getCallAmount();
    
    let newPlayers = [...players];
    let actionDescription = '';
    let potIncrease = 0;
    let shouldGoToShowdown = false;

    switch (actionType) {
      case 'fold':
        newPlayers[currentPlayerIndex] = {
          ...player,
          hasFolded: true,
          hasActed: true
        };
        actionDescription = `${player.name} folds`;
        break;

      case 'check':
        newPlayers[currentPlayerIndex] = {
          ...player,
          hasActed: true
        };
        actionDescription = `${player.name} checks`;
        break;

      case 'call': {
        const actualCallAmount = Math.min(callAmount, player.balance);
        newPlayers[currentPlayerIndex] = {
          ...player,
          balance: player.balance - actualCallAmount,
          currentBet: player.currentBet + actualCallAmount,
          hasActed: true,
          isAllIn: player.balance <= actualCallAmount
        };
        potIncrease = actualCallAmount;
        actionDescription = player.balance <= actualCallAmount ? 
          `${player.name} calls $${actualCallAmount} (All-in)` :
          `${player.name} calls $${actualCallAmount}`;
        
        if (opponent.isAllIn && !opponent.hasFolded) {
          shouldGoToShowdown = true;
        }
        break;
      }

      case 'bet':
      case 'raise': {
        const validAmount = getValidBetAmount(amount);
        const actualBetAmount = Math.min(validAmount, player.balance);
        newPlayers[currentPlayerIndex] = {
          ...player,
          balance: player.balance - actualBetAmount,
          currentBet: player.currentBet + actualBetAmount,
          hasActed: true,
          isAllIn: player.balance <= actualBetAmount
        };
        potIncrease = actualBetAmount;
        
        if (actualBetAmount > callAmount) {
          newPlayers = newPlayers.map(p => 
            p.id === player.id ? newPlayers.find(np => np.id === p.id)! : 
            p.hasFolded || p.isAllIn ? p : { ...p, hasActed: false }
          );
        }
        
        const newTotalBet = player.currentBet + actualBetAmount;
        actionDescription = callAmount > 0 ? 
          `${player.name} raises to $${newTotalBet}` :
          `${player.name} bets $${actualBetAmount}`;
        
        if (player.balance <= actualBetAmount) {
          actionDescription += ' (All-in)';
        }
        break;
      }
    }

    setPlayers(newPlayers);
    setCurrentPot(prev => prev + potIncrease);
    setLastAction(actionDescription);
    setCustomBetAmount('');
    
    setTimeout(() => {
      const activePlayers = newPlayers.filter(p => !p.hasFolded);
      
      if (activePlayers.length === 1) {
        const winner = activePlayers[0];
        setTimeout(() => awardPot(winner.id), 1000);
        return;
      }
      
      if (shouldGoToShowdown) {
        setGamePhase('showdown');
        setLastAction('Showdown - Reveal hands!');
      } else {
        checkBettingRoundComplete(newPlayers);
      }
    }, 500);
  };

  const checkBettingRoundComplete = (currentPlayers: Player[]) => {
    const activePlayers = currentPlayers.filter(p => !p.hasFolded);
    const playersWhoCanAct = activePlayers.filter(p => !p.isAllIn);
    const maxBet = Math.max(...currentPlayers.map(p => p.currentBet));
    
    const allMatched = activePlayers.every(p => p.currentBet === maxBet || p.isAllIn);
    const allActed = playersWhoCanAct.every(p => p.hasActed);
    
    const hasUnmatchedAllIn = activePlayers.some(p => p.isAllIn && p.currentBet > 0) &&
                              activePlayers.some(p => !p.isAllIn && p.currentBet < maxBet);
    
    if (hasUnmatchedAllIn) {
      moveToNextPlayer();
      return;
    }
    
    if ((allActed && allMatched) || playersWhoCanAct.length === 0) {
      const hasAllInPlayer = activePlayers.some(p => p.isAllIn);
      
      if (hasAllInPlayer && allMatched) {
        setGamePhase('showdown');
        setLastAction('Showdown - Reveal hands!');
      } else if (playersWhoCanAct.length === 0) {
        setGamePhase('showdown');
        setLastAction('Showdown - Reveal hands!');
      } else {
        nextBettingRound();
      }
    } else {
      moveToNextPlayer();
    }
  };

  const moveToNextPlayer = () => {
    let nextIndex = currentPlayerIndex;
    let attempts = 0;
    
    do {
      nextIndex = (nextIndex + 1) % players.length;
      attempts++;
    } while (
      attempts < players.length && 
      (players[nextIndex].hasFolded || players[nextIndex].isAllIn)
    );
    
    if (attempts < players.length) {
      setCurrentPlayerIndex(nextIndex);
    }
  };

  const nextBettingRound = () => {
    setPlayers(prev => prev.map(p => ({
      ...p,
      currentBet: 0,
      hasActed: false
    })));

    let nextPhase: GamePhase;
    if (gamePhase === 'preflop') {
      nextPhase = 'flop';
      setLastAction('Flop cards dealt');
    } else if (gamePhase === 'flop') {
      nextPhase = 'turn';
      setLastAction('Turn card dealt');
    } else if (gamePhase === 'turn') {
      nextPhase = 'river';
      setLastAction('River card dealt');
    } else {
      nextPhase = 'showdown';
      setLastAction('Showdown - Reveal hands!');
      setGamePhase('showdown');
      return;
    }

    setGamePhase(nextPhase);

    const activePlayers = players.filter(p => !p.hasFolded);
    const playersWhoCanAct = activePlayers.filter(p => !p.isAllIn);
    
    if (playersWhoCanAct.length === 0) {
      setGamePhase('showdown');
      setLastAction('Showdown - Reveal hands!');
      return;
    }
    
    if (playersWhoCanAct.length === 1 && activePlayers.length > 1) {
      setGamePhase('showdown');
      setLastAction('Showdown - Reveal hands!');
      return;
    }
    
    if (playersWhoCanAct.length > 1) {
      let firstPlayerIndex = (dealerIndex + 1) % players.length;
      let attempts = 0;
      
      while (attempts < players.length && 
             (players[firstPlayerIndex].hasFolded || players[firstPlayerIndex].isAllIn)) {
        firstPlayerIndex = (firstPlayerIndex + 1) % players.length;
        attempts++;
      }
      
      if (attempts < players.length) {
        setCurrentPlayerIndex(firstPlayerIndex);
      }
    }
  };

  const awardPot = (winnerId: number) => {
    const winner = players.find(p => p.id === winnerId);
    if (!winner) return;

    let winAmount = currentPot;
    
    setWinnerAnimation({ playerId: winnerId, amount: winAmount });
    
    setPlayers(prev => prev.map(p => 
      p.id === winnerId 
        ? { ...p, balance: p.balance + winAmount }
        : p
    ));
    
    setLastAction(`${winner.name} wins $${winAmount}!`);
    
    setTimeout(() => {
      setWinnerAnimation(null);
      nextHand();
    }, 3000);
  };

  const splitPot = () => {
    const activePlayers = players.filter(p => !p.hasFolded);
    const splitAmount = Math.floor(currentPot / activePlayers.length);
    const remainder = currentPot % activePlayers.length;
    
    setPlayers(prev => prev.map(p => {
      const activePlayerIndex = activePlayers.findIndex(ap => ap.id === p.id);
      if (activePlayerIndex !== -1) {
        const bonus = activePlayerIndex === 0 ? remainder : 0;
        return { ...p, balance: p.balance + splitAmount + bonus };
      }
      return p;
    }));
    
    const playerNames = activePlayers.map(p => p.name).join(' & ');
    setLastAction(`Split pot! ${playerNames} each win $${splitAmount}${remainder > 0 ? ` (+$${remainder} to ${activePlayers[0].name})` : ''}!`);
    
    setTimeout(() => {
      nextHand();
    }, 3000);
  };

  const nextHand = () => {
    setCurrentPot(0);
    setHandNumber(prev => prev + 1);
    setGamePhase('preflop');
    setLastAction('');
    setDealerIndex(prev => (prev + 1) % players.length);
    
    setTimeout(() => {
      startNewHand();
    }, 1000);
  };

  const resetGame = () => {
    setPlayers(prev => prev.map(p => ({
      ...p,
      balance: 500,
      currentBet: 0,
      hasActed: false,
      hasFolded: false,
      isDealer: false,
      isSmallBlind: false,
      isBigBlind: false,
      isAllIn: false,
    })));
    setCurrentPot(0);
    setHandNumber(1);
    setGamePhase('preflop');
    setCurrentPlayerIndex(0);
    setDealerIndex(0);
    setGameStarted(false);
    setLastAction('');
    setCustomBetAmount('');
    setWinnerAnimation(null);
  };

  const activePlayers = getActivePlayers();
  const currentPlayer = getCurrentPlayer();
  const opponent = getOpponent();
  const callAmount = getCallAmount();
  const canAct = gamePhase !== 'showdown' && currentPlayer && !currentPlayer.hasFolded && !currentPlayer.isAllIn;
  const minRaise = getMinRaise();
  const isOpponentAllIn = opponent && opponent.isAllIn && !opponent.hasFolded;

  const getActionOptions = () => {
    if (!canAct) return null;
    
    const options = [];
    const maxBet = getMaxBet();
    
    // Can always fold
    options.push({
      action: 'fold',
      label: 'FOLD',
      className: 'bg-red-600 hover:bg-red-700'
    });
    
    // Check or Call
    if (callAmount === 0) {
      options.push({
        action: 'check',
        label: 'CHECK',
        className: 'bg-green-600 hover:bg-green-700'
      });
    } else {
      const callLabel = isOpponentAllIn ? 
        `CALL $${callAmount}` : 
        `MATCH BET $${maxBet}`;
      options.push({
        action: 'call',
        label: callLabel,
        className: 'bg-green-600 hover:bg-green-700'
      });
    }
    
    return options;
  };

  const getPlayerStatusBadges = (player: Player, index: number) => {
    const badges = [];
    
    if (player.isDealer) {
      badges.push(
        <span key="dealer" className="bg-gray-500 text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
          <Crown className="w-3 h-3" />
          Dealer
        </span>
      );
    }
    
    if (player.isSmallBlind) {
      badges.push(<span key="sb" className="bg-gray-500 text-white px-2 py-1 rounded text-xs font-bold">Small Blind</span>);
    }
    
    if (player.isBigBlind) {
      badges.push(<span key="bb" className="bg-gray-500 text-white px-2 py-1 rounded text-xs font-bold">Big Blind</span>);
    }
    
    if (player.hasFolded) {
      badges.push(<span key="folded" className="bg-gray-600 text-white px-2 py-1 rounded text-xs font-bold">FOLDED</span>);
    } else if (player.isAllIn) {
      badges.push(<span key="allin" className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-bold">ALL-IN</span>);
    } else if (currentPlayerIndex === index && canAct) {
      badges.push(
        <span key="turn" className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
          <Target className="w-3 h-3" />
          CURRENT TURN
        </span>
      );
    }
    
    return badges;
  };

  const handleCustomBet = () => {
    const amount = parseInt(customBetAmount);
    if (isNaN(amount) || amount <= 0) return;
    if (isOpponentAllIn) return; // no raises when opp is all-in
    handleAction(callAmount > 0 ? 'raise' : 'bet', amount);
  };

  const actionOptions = getActionOptions();

  return (
    <div className="min-h-screen bg-gray-800 p-2 overflow-hidden">
      <div className="max-w-4xl mx-auto h-screen flex flex-col">
        {/* Compact Header */}
        <div className="h-[23dvh] bg-gray-900 rounded-t-lg p-3 shadow-lg flex-shrink-0">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <div className="bg-green-900 p-2 rounded-full">
                <Users className="text-white w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Poker Cash Game</h1>
                <p className="text-gray-400 text-sm">${smallBlind}/${bigBlind} Hold'em</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBalances(!showBalances)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
              >
                {showBalances ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showBalances ? 'Hide' : 'Show'}
              </button>
              <button
                onClick={resetGame}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>
          </div>
          
          {/* Compact Stats */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-gray-800 rounded p-2">
              <div className="text-gray-400 text-xs">Hand #{handNumber}</div>
              <div className="text-red-500 text-sm font-bold">{gamePhase.toUpperCase()}</div>
            </div>
            <div className="bg-gray-800 rounded p-2">
              <div className="text-gray-400 text-xs">Pot</div>
              <div className="text-green-400 text-lg font-bold">${currentPot}</div>
            </div>
            <div className="bg-gray-800 rounded p-2">
              <div className="text-gray-400 text-xs">To Call</div>
              <div className="text-red-500 text-sm font-bold">${callAmount}</div>
            </div>
          </div>

          {/* Status */}
          {lastAction && (
            <div className="mt-2 bg-gray-800 rounded p-2 text-center">
              <div className="text-gray-400 text-sm">{lastAction}</div>
            </div>
          )}
        </div>

        {/* Players - Maintains Fixed Height */}
        <div className="h-[27dvh] bg-green-800 p-3 flex-shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full">
            {players.map((player, index) => (
              <div
                key={player.id}
                className={`bg-gray-900 rounded-lg p-3 shadow-lg border-2 transition-all duration-200 relative ${
                  currentPlayerIndex === index && canAct
                    ? 'border-green-400 shadow-green-400/50'
                    : player.hasFolded
                    ? 'border-red-500 opacity-60'
                    : player.isAllIn
                    ? 'border-purple-500'
                    : 'border-gray-700'
                }`}
              >
                {winnerAnimation && winnerAnimation.playerId === player.id && (
                  <div className="absolute -top-2 -right-2 bg-yellow-500 text-black px-2 py-1 rounded-full text-sm font-bold animate-bounce">
                    +${winnerAnimation.amount}
                  </div>
                )}
                
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-white">{player.name}</h3>
                    <div className="flex flex-wrap gap-1">
                      {getPlayerStatusBadges(player, index)}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {showBalances && (
                    <div className="flex justify-between items-center bg-gray-800 rounded p-2">
                      <span className="text-gray-300 text-sm">Balance:</span>
                      <span className="text-green-400 font-bold">${player.balance}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center bg-gray-800 rounded p-2">
                    <span className="text-gray-300 text-sm">Current Bet:</span>
                    <span className="text-red-500 font-bold">${player.currentBet}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Controls - Compact */}
        {canAct && actionOptions && (
          <div className="h-[50dvh] bg-gray-900 p-3 flex-shrink-0">
            <div className="text-center mb-3">
              <h3 className="text-lg font-bold text-white flex items-center justify-center gap-1">
                <Target className="text-green-400 w-4 h-4" />
                {currentPlayer.name}'s Turn
              </h3>
              {isOpponentAllIn && (
                <p className="text-yellow-400 text-sm mt-1">Opponent is ALL-IN - You can only FOLD or CALL</p>
              )}
            </div>
            
            {/* Quick Bets & Custom Input - Only show if opponent is NOT all-in */}
            {!isOpponentAllIn && (
              <div className="mb-3">
                <div className="flex flex-wrap justify-center gap-2 mb-2">
                  {/* Min Raise Button */}
                  {currentPlayer.balance >= minRaise && (
                    <button
                      onClick={() => setCustomBetAmount(minRaise.toString())}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-semibold border-2 border-blue-400"
                    >
                      Min Raise ${minRaise}
                    </button>
                  )}
                  
                  {quickBetAmounts.map(amount => {
                    const isDisabled = amount > currentPlayer.balance || amount < minRaise;
                    return (
                      <button
                        key={amount}
                        onClick={() => setCustomBetAmount(amount.toString())}
                        disabled={isDisabled}
                        className={`px-3 py-1 rounded text-sm font-semibold ${
                          isDisabled 
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                            : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                        }`}
                      >
                        ${amount}
                      </button>
                    );
                  })}
                  
                  {currentPlayer.balance > callAmount && (
                    <button
                      onClick={() => setCustomBetAmount(currentPlayer.balance.toString())}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm font-semibold"
                    >
                      All-In ${currentPlayer.balance}
                    </button>
                  )}
                </div>
                
                {/* Custom Bet Input */}
                <div className="flex justify-center gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={callAmount > 0 ? minRaise : 5}
                    value={customBetAmount}
                    onChange={(e) => setCustomBetAmount(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder={callAmount > 0 ? `Min Raise: ${minRaise}` : '5'}
                    className="bg-gray-800 text-white px-3 py-1 rounded text-sm w-32 text-center"
                  />
                  <button
                    onClick={handleCustomBet}
                    disabled={
                      !customBetAmount ||
                      parseInt(customBetAmount) < (callAmount > 0 ? minRaise : 5) ||
                      parseInt(customBetAmount) > currentPlayer.balance
                    }
                    className={`px-3 py-1 rounded text-sm ${
                      !customBetAmount ||
                      parseInt(customBetAmount) < (callAmount > 0 ? minRaise : 5) ||
                      parseInt(customBetAmount) > currentPlayer.balance
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    }`}
                  >
                    {callAmount > 0 ? 'Raise' : 'Bet'}
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-center gap-3">
              {actionOptions.map(option => (
                <button
                  key={option.action}
                  onClick={() => handleAction(option.action)}
                  className={`${option.className} text-white px-6 py-2 rounded-lg font-bold transition-colors`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Showdown - Fixed Height to Match Controls */}
        {gamePhase === 'showdown' && (
          <div className="h-[50dvh] bg-gray-900 p-3 flex-shrink-0 flex flex-col justify-center">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-white flex items-center justify-center gap-2 mb-2">
                <Trophy className="text-yellow-400 w-5 h-5" />
                Select the Winner
              </h3>
              <p className="text-gray-300 text-sm">Total Pot: <span className="text-green-400 font-bold">${currentPot}</span></p>
              <p className="text-gray-400 text-xs mt-1">Click on the player who won the hand or choose tie</p>
            </div>
            
            <div className="flex justify-center gap-3 flex-wrap">
              {activePlayers.map(player => (
                <button
                  key={player.id}
                  onClick={() => awardPot(player.id)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-2 rounded-lg font-bold transition-colors"
                >
                  {player.name} WINS
                </button>
              ))}
              
              {activePlayers.length >= 2 && (
                <button
                  onClick={splitPot}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-2 rounded-lg font-bold transition-colors"
                >
                  TIE - SPLIT POT
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Poker;
