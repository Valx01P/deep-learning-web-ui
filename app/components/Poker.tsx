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
    
    // Otherwise, minimum raise is call amount + the size of the current highest bet
    // In poker, you must raise by at least the size of the previous bet/raise
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
      
      // Auto-populate min raise for first player to act
      setTimeout(() => {
        const playerToAct = players[firstToAct];
        if (playerToAct && !playerToAct.hasFolded && !playerToAct.isAllIn) {
          // BUGFIX: The 'players' state is stale inside this timeout.
          // We must calculate the min raise based on the known blind structure for the first actor.
          // The call amount for the first actor (SB) is bigBlind - smallBlind.
          // The min raise is that call amount plus the big blind value.
          const callAmountForFirstActor = bigBlind - smallBlind;
          const minRaiseAmount = callAmountForFirstActor + bigBlind;
          
          setCustomBetAmount(minRaiseAmount.toString());
        }
      }, 1000); // Slightly longer delay to ensure player state is updated
    }, 800);

    setGamePhase('preflop');
    setGameStarted(true);
  };

  useEffect(() => {
    if (!gameStarted) {
      startNewHand();
    }
  }, [gameStarted]);

  const handleAction = (actionType: string, amount: number = 0) => {
    const player = getCurrentPlayer();
    const callAmount = getCallAmount();
    
    let newPlayers = [...players];
    let actionDescription = '';
    let potIncrease = 0;

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

      case 'call':
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
        break;

      case 'bet':
      case 'raise':
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
        
        // Reset other players' hasActed status if this is a raise
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
      
      checkBettingRoundComplete(newPlayers);
    }, 500);
  };

  const checkBettingRoundComplete = (currentPlayers: Player[]) => {
    const activePlayers = currentPlayers.filter(p => !p.hasFolded);
    const playersWhoCanAct = activePlayers.filter(p => !p.isAllIn);
    const maxBet = Math.max(...currentPlayers.map(p => p.currentBet));
    
    const allMatched = activePlayers.every(p => p.currentBet === maxBet || p.isAllIn);
    const allActed = playersWhoCanAct.every(p => p.hasActed);
    
    if ((allActed && allMatched) || playersWhoCanAct.length <= 1) {
      nextBettingRound();
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
      // Auto-populate min raise amount when it's a new player's turn
      setTimeout(() => {
        const newCurrentPlayer = players[nextIndex];
        if (newCurrentPlayer && !newCurrentPlayer.hasFolded && !newCurrentPlayer.isAllIn) {
          // Calculate min raise based on the current game state
          const maxBet = Math.max(...players.map(p => p.currentBet));
          const callAmount = Math.max(0, maxBet - newCurrentPlayer.currentBet);
          
          // If no one has bet yet, minimum bet is $5
          let minRaiseAmount;
          if (maxBet === 0) {
            minRaiseAmount = 5;
          } else {
            // Otherwise, minimum raise is call amount + the size of current highest bet
            minRaiseAmount = callAmount + maxBet;
          }
          
          // Only auto-populate if player can afford the min raise
          if (newCurrentPlayer.balance >= minRaiseAmount) {
            setCustomBetAmount(minRaiseAmount.toString());
          }
        }
      }, 100);
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

    const activePlayers = players.filter(p => !p.hasFolded && !p.isAllIn);
    if (activePlayers.length > 1) {
      let firstPlayerIndex = (dealerIndex + 1) % players.length;
      let attempts = 0;
      
      while (attempts < players.length && 
             (players[firstPlayerIndex].hasFolded || players[firstPlayerIndex].isAllIn)) {
        firstPlayerIndex = (firstPlayerIndex + 1) % players.length;
        attempts++;
      }
      
      if (attempts < players.length) {
        setCurrentPlayerIndex(firstPlayerIndex);
        // Auto-populate min raise for new betting round
        setTimeout(() => {
          if (players[firstPlayerIndex] && !players[firstPlayerIndex].hasFolded && !players[firstPlayerIndex].isAllIn) {
            setCustomBetAmount('5'); // In new rounds, min bet is $5
          }
        }, 100);
      }
    } else {
      setGamePhase('showdown');
      setLastAction('Showdown - Reveal hands!');
    }
  };

  const awardPot = (winnerId: number) => {
    const winner = players.find(p => p.id === winnerId);
    if (!winner) return;

    // Calculate side pots for all-in situations
    const activePlayers = players.filter(p => !p.hasFolded);
    let winAmount = currentPot;
    
    // For simplicity, give full pot to winner
    // In real poker, side pots would be calculated based on effective stacks
    
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
  const callAmount = getCallAmount();
  const canAct = gamePhase !== 'showdown' && currentPlayer && !currentPlayer.hasFolded && !currentPlayer.isAllIn;
  const minRaise = getMinRaise();

  const getActionOptions = () => {
    if (!canAct) return null;
    
    const options = [];
    const opponentBet = getMaxBet();
    
    // Can always fold
    options.push({
      action: 'fold',
      label: 'FOLD',
      className: 'bg-red-600 hover:bg-red-700'
    });
    
    // Check or Match Bet
    if (callAmount === 0) {
      options.push({
        action: 'check',
        label: 'CHECK',
        className: 'bg-green-600 hover:bg-green-700'
      });
    } else {
      options.push({
        action: 'call',
        label: `MATCH BET ${getMaxBet()}`,
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

        {/* Players - Compact */}
        <div className="h-[27dvh] bg-green-800 p-3 flex-grow">
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
                    <span className="text-gray-300 text-sm">Bet:</span>
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
            </div>
            
            {/* Quick Bets & Custom Input */}
            <div className="mb-3">
              <div className="flex flex-wrap justify-center gap-2 mb-2">
                {/* Min Raise Button - Show when player can raise */}
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
                      className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-sm font-semibold"
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
                  type="text"
                  value={customBetAmount}
                  onChange={(e) => setCustomBetAmount(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder={currentPlayer.balance >= minRaise ? `${minRaise}` : `Min: ${minRaise}`}
                  className="bg-gray-800 text-white px-3 py-1 rounded text-sm w-32 text-center"
                />
                <button
                  onClick={handleCustomBet}
                  disabled={!customBetAmount || parseInt(customBetAmount) < minRaise || parseInt(customBetAmount) > currentPlayer.balance}
                  className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-sm"
                >
                  {callAmount > 0 ? 'Raise' : 'Bet'}
                </button>
              </div>
            </div>

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

        {/* Showdown - Expanded */}
        {gamePhase === 'showdown' && (
          <div className="bg-gray-900 p-4 flex-grow min-h-[300px] flex flex-col justify-center">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white flex items-center justify-center gap-3 mb-4">
                <Trophy className="text-yellow-400 w-8 h-8" />
                Select the Winner
                <Trophy className="text-yellow-400 w-8 h-8" />
              </h3>
              <p className="text-gray-300 text-xl">Total Pot: <span className="text-green-400 font-bold text-2xl">${currentPot}</span></p>
              <p className="text-gray-400 mt-2">Click on the player who won the hand</p>
            </div>
            
            <div className="flex justify-center gap-6 flex-wrap">
              {activePlayers.map(player => (
                <button
                  key={player.id}
                  onClick={() => awardPot(player.id)}
                  className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black px-8 py-6 rounded-xl font-bold text-xl transition-all transform hover:scale-105 shadow-lg min-w-[200px]"
                >
                  🏆 {player.name} WINS
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Poker;