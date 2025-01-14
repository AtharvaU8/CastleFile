//Chess and Chessboard adapted from https://github.com/zeyu2001/chess-ai


var STACK_SIZE = 100; // maximum size of undo stack
var $board = $('#myBoard');
var game = new Chess();
var globalSum = 0; // always from black's perspective. Negative for white's perspective.
var whiteSquareGrey = '#a9a9a9';
var blackSquareGrey = '#696969';

var squareClass = 'square-55d63';
var squareToHighlight = null;
var colorToHighlight = null;
var positionCount;

var config = {
  draggable: false,
  position: 'start',
  onDragStart: onDragStart,
  onDrop: onDrop,
  onMouseoutSquare: onMouseoutSquare,
  onMouseoverSquare: onMouseoverSquare,
  onSnapEnd: onSnapEnd,
};
board = Chessboard('myBoard', config);


timer = null;



/*
 * Piece Square Tables, adapted from Sunfish.py:
 * https://github.com/thomasahle/sunfish/blob/master/sunfish.py
 */

var weights = { p: 100, n: 280, b: 320, r: 479, q: 929, k: 60000, k_e: 60000 };
var pst_w = {
  p: [
    [100, 100, 100, 100, 105, 100, 100, 100],
    [78, 83, 86, 73, 102, 82, 85, 90],
    [7, 29, 21, 44, 40, 31, 44, 7],
    [-17, 16, -2, 15, 14, 0, 15, -13],
    [-26, 3, 10, 9, 6, 1, 0, -23],
    [-22, 9, 5, -11, -10, -2, 3, -19],
    [-31, 8, -7, -37, -36, -14, 3, -31],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  n: [
    [-66, -53, -75, -75, -10, -55, -58, -70],
    [-3, -6, 100, -36, 4, 62, -4, -14],
    [10, 67, 1, 74, 73, 27, 62, -2],
    [24, 24, 45, 37, 33, 41, 25, 17],
    [-1, 5, 31, 21, 22, 35, 2, 0],
    [-18, 10, 13, 22, 18, 15, 11, -14],
    [-23, -15, 2, 0, 2, 0, -23, -20],
    [-74, -23, -26, -24, -19, -35, -22, -69],
  ],
  b: [
    [-59, -78, -82, -76, -23, -107, -37, -50],
    [-11, 20, 35, -42, -39, 31, 2, -22],
    [-9, 39, -32, 41, 52, -10, 28, -14],
    [25, 17, 20, 34, 26, 25, 15, 10],
    [13, 10, 17, 23, 17, 16, 0, 7],
    [14, 25, 24, 15, 8, 25, 20, 15],
    [19, 20, 11, 6, 7, 6, 20, 16],
    [-7, 2, -15, -12, -14, -15, -10, -10],
  ],
  r: [
    [35, 29, 33, 4, 37, 33, 56, 50],
    [55, 29, 56, 67, 55, 62, 34, 60],
    [19, 35, 28, 33, 45, 27, 25, 15],
    [0, 5, 16, 13, 18, -4, -9, -6],
    [-28, -35, -16, -21, -13, -29, -46, -30],
    [-42, -28, -42, -25, -25, -35, -26, -46],
    [-53, -38, -31, -26, -29, -43, -44, -53],
    [-30, -24, -18, 5, -2, -18, -31, -32],
  ],
  q: [
    [6, 1, -8, -104, 69, 24, 88, 26],
    [14, 32, 60, -10, 20, 76, 57, 24],
    [-2, 43, 32, 60, 72, 63, 43, 2],
    [1, -16, 22, 17, 25, 20, -13, -6],
    [-14, -15, -2, -5, -1, -10, -20, -22],
    [-30, -6, -13, -11, -16, -11, -16, -27],
    [-36, -18, 0, -19, -15, -15, -21, -38],
    [-39, -30, -31, -13, -31, -36, -34, -42],
  ],
  k: [
    [4, 54, 47, -99, -99, 60, 83, -62],
    [-32, 10, 55, 56, 56, 55, 10, 3],
    [-62, 12, -57, 44, -67, 28, 37, -31],
    [-55, 50, 11, -4, -19, 13, 0, -49],
    [-55, -43, -52, -28, -51, -47, -8, -50],
    [-47, -42, -43, -79, -64, -32, -29, -32],
    [-4, 3, -14, -50, -57, -18, 13, 4],
    [17, 30, -3, -14, 6, -1, 40, 18],
  ],

  // Endgame King Table
  k_e: [
    [-50, -40, -30, -20, -20, -30, -40, -50],
    [-30, -20, -10, 0, 0, -10, -20, -30],
    [-30, -10, 20, 30, 30, 20, -10, -30],
    [-30, -10, 30, 40, 40, 30, -10, -30],
    [-30, -10, 30, 40, 40, 30, -10, -30],
    [-30, -10, 20, 30, 30, 20, -10, -30],
    [-30, -30, 0, 0, 0, 0, -30, -30],
    [-50, -30, -30, -30, -30, -30, -30, -50],
  ],
};
var pst_b = {
  p: pst_w['p'].slice().reverse(),
  n: pst_w['n'].slice().reverse(),
  b: pst_w['b'].slice().reverse(),
  r: pst_w['r'].slice().reverse(),
  q: pst_w['q'].slice().reverse(),
  k: pst_w['k'].slice().reverse(),
  k_e: pst_w['k_e'].slice().reverse(),
};

var pstOpponent = { w: pst_b, b: pst_w };
var pstSelf = { w: pst_w, b: pst_b };

/*
 * Evaluates the board at this point in time,
 * using the material weights and piece square tables.
 */
function evaluateBoard(game, move, prevSum, color) {

  if (game.in_checkmate()) {

    // Opponent is in checkmate (good for us)
    if (move.color === color) {
      return 10 ** 10;
    }
    // Our king's in checkmate (bad for us)
    else {
      return -(10 ** 10);
    }
  }

  if (game.in_draw() || game.in_threefold_repetition() || game.in_stalemate())
  {
    return 0;
  }

  if (game.in_check()) {
    // Opponent is in check (good for us)
    if (move.color === color) {
      prevSum += 50;
    }
    // Our king's in check (bad for us)
    else {
      prevSum -= 50;
    }
  }

  var from = [
    8 - parseInt(move.from[1]),
    move.from.charCodeAt(0) - 'a'.charCodeAt(0),
  ];
  var to = [
    8 - parseInt(move.to[1]),
    move.to.charCodeAt(0) - 'a'.charCodeAt(0),
  ];

  // Change endgame behavior for kings
  if (prevSum < -1500) {
    if (move.piece === 'k') {
      move.piece = 'k_e';
    }
  }

  if ('captured' in move) {
    // Opponent piece was captured (good for us)
    if (move.color === color) {
      prevSum +=
        weights[move.captured] +
        pstOpponent[move.color][move.captured][to[0]][to[1]];
    }
    // Our piece was captured (bad for us)
    else {
      prevSum -=
        weights[move.captured] +
        pstSelf[move.color][move.captured][to[0]][to[1]];
    }
  }

  if (move.flags.includes('p')) {
    // NOTE: promote to queen for simplicity
    move.promotion = 'q';

    // Our piece was promoted (good for us)
    if (move.color === color) {
      prevSum -=
        weights[move.piece] + pstSelf[move.color][move.piece][from[0]][from[1]];
      prevSum +=
        weights[move.promotion] +
        pstSelf[move.color][move.promotion][to[0]][to[1]];
    }
    // Opponent piece was promoted (bad for us)
    else {
      prevSum +=
        weights[move.piece] + pstSelf[move.color][move.piece][from[0]][from[1]];
      prevSum -=
        weights[move.promotion] +
        pstSelf[move.color][move.promotion][to[0]][to[1]];
    }
  } else {
    // The moved piece still exists on the updated board, so we only need to update the position value
    if (move.color !== color) {
      prevSum += pstSelf[move.color][move.piece][from[0]][from[1]];
      prevSum -= pstSelf[move.color][move.piece][to[0]][to[1]];
    } else {
      prevSum -= pstSelf[move.color][move.piece][from[0]][from[1]];
      prevSum += pstSelf[move.color][move.piece][to[0]][to[1]];
    }
  }

  return prevSum;
}

/*
 * Performs the minimax algorithm to choose the best move: https://en.wikipedia.org/wiki/Minimax (pseudocode provided)
 * Recursively explores all possible moves up to a given depth, and evaluates the game board at the leaves.
 *
 * Basic idea: maximize the minimum value of the position resulting from the opponent's possible following moves.
 * Optimization: alpha-beta pruning: https://en.wikipedia.org/wiki/Alpha%E2%80%93beta_pruning (pseudocode provided)
 *
 * Inputs:
 *  - game:                 the game object.
 *  - depth:                the depth of the recursive tree of all possible moves (i.e. height limit).
 *  - isMaximizingPlayer:   true if the current layer is maximizing, false otherwise.
 *  - sum:                  the sum (evaluation) so far at the current layer.
 *  - color:                the color of the current player.
 *
 * Output:
 *  the best move at the root of the current subtree.
 */
function minimax(game, depth, alpha, beta, isMaximizingPlayer, sum, color) {
  positionCount++;
  var children = game.ugly_moves({ verbose: true });

  // Sort moves randomly, so the same move isn't always picked on ties
  children.sort(function (a, b) {
    return 0.5 - Math.random();
  });

  var currMove;
  // Maximum depth exceeded or node is a terminal node (no children)
  if (depth === 0 || children.length === 0) {
    return [null, sum];
  }

  // Find maximum/minimum from list of 'children' (possible moves)
  var maxValue = Number.NEGATIVE_INFINITY;
  var minValue = Number.POSITIVE_INFINITY;
  var bestMove;
  for (var i = 0; i < children.length; i++) {
    currMove = children[i];

    // Note: in our case, the 'children' are simply modified game states
    var currPrettyMove = game.ugly_move(currMove);
    var newSum = evaluateBoard(game, currPrettyMove, sum, color);
    var [childBestMove, childValue] = minimax(
      game,
      depth - 1,
      alpha,
      beta,
      !isMaximizingPlayer,
      newSum,
      color
    );

    game.undo();

    if (isMaximizingPlayer) {
      if (childValue > maxValue) {
        maxValue = childValue;
        bestMove = currPrettyMove;
      }
      if (childValue > alpha) {
        alpha = childValue;
      }
    } else {
      if (childValue < minValue) {
        minValue = childValue;
        bestMove = currPrettyMove;
      }
      if (childValue < beta) {
        beta = childValue;
      }
    }

    // Alpha-beta pruning
    if (alpha >= beta) {
      break;
    }
  }

  if (isMaximizingPlayer) {
    return [bestMove, maxValue];
  } else {
    return [bestMove, minValue];
  }
}

function checkStatus(color) {
  if (game.in_checkmate()) {
    $('#status').html(`<b>Checkmate!</b> Oops, <b>${color}</b> lost.`);
  } else if (game.insufficient_material()) {
    $('#status').html(`It's a <b>draw!</b> (Insufficient Material)`);
  } else if (game.in_threefold_repetition()) {
    $('#status').html(`It's a <b>draw!</b> (Threefold Repetition)`);
  } else if (game.in_stalemate()) {
    $('#status').html(`It's a <b>draw!</b> (Stalemate)`);
  } else if (game.in_draw()) {
    $('#status').html(`It's a <b>draw!</b> (50-move Rule)`);
  } else if (game.in_check()) {
    $('#status').html(`Oops, <b>${color}</b> is in <b>check!</b>`);
    return false;
  } else {
    $('#status').html(`No check, checkmate, or draw.`);
    return false;
  }
  return true;
}

function updateAdvantage() {
  if (globalSum > 0) {
    $('#advantageColor').text('Black');
    $('#advantageNumber').text(globalSum);
  } else if (globalSum < 0) {
    $('#advantageColor').text('White');
    $('#advantageNumber').text(-globalSum);
  } else {
    $('#advantageColor').text('Neither side');
    $('#advantageNumber').text(globalSum);
  }
  $('#advantageBar').attr({
    'aria-valuenow': `${-globalSum}`,
    style: `width: ${((-globalSum + 2000) / 4000) * 100}%`,
  });
}

/*
 * Calculates the best legal move for the given color.
 */
function getBestMove(game, color, currSum) {
  positionCount = 0;

  if (color === 'b') {
    var depth = parseInt($('#search-depth').find(':selected').text());
  } else {
    var depth = parseInt($('#search-depth-white').find(':selected').text());
  }

  var d = new Date().getTime();
  var [bestMove, bestMoveValue] = minimax(
    game,
    depth,
    Number.NEGATIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    true,
    currSum,
    color
  );
  var d2 = new Date().getTime();
  var moveTime = d2 - d;
  var positionsPerS = (positionCount * 1000) / moveTime;

  $('#position-count').text(positionCount);
  $('#time').text(moveTime / 500);
  $('#positions-per-s').text(Math.round(positionsPerS));

  return [bestMove, bestMoveValue];
}

/*
 * Makes the best legal move for the given color.
 */
 let botMoves = [];
function makeBestMove(color) {
  if (color === 'b') {
    var move = getBestMove(game, color, globalSum)[0];
  } else {
    var move = getBestMove(game, color, -globalSum)[0];
  }

  globalSum = evaluateBoard(game, move, globalSum, 'b');
  updateAdvantage();
  
  game.move(move);
  board.position(game.fen());
  botMoves.push(move.san); // Track the bot's move
  console.log("bot moves:", botMoves);
  onMove();
  if (color === 'b') {
    checkStatus('black');

    // Highlight black move
    $board.find('.' + squareClass).removeClass('highlight-black');
    $board.find('.square-' + move.from).addClass('highlight-black');
    squareToHighlight = move.to;
    colorToHighlight = 'black';

    $board
      .find('.square-' + squareToHighlight)
      .addClass('highlight-' + colorToHighlight);
  } else {
    checkStatus('white');

    // Highlight white move
    $board.find('.' + squareClass).removeClass('highlight-white');
    $board.find('.square-' + move.from).addClass('highlight-white');
    squareToHighlight = move.to;
    colorToHighlight = 'white';

    $board
      .find('.square-' + squareToHighlight)
      .addClass('highlight-' + colorToHighlight);
  }
}


/*
 * Resets the game to its initial state.
 */

var undo_stack = [];
let unstack = [];

function undo() {
  var move = game.undo();
  undo_stack.push(move);
  // Maintain a maximum stack size
  if (undo_stack.length > STACK_SIZE) {
    undo_stack.shift();
  }
  board.position(game.fen());
}
$('#undoBtn').on('click', function () {
  if (game.history().length >= 2) {
    
    bm = botMoves.pop();
    um = userMoves.pop();
    
    unstack.push(bm)
    console.log("User moves:",userMoves);
    unstack.push(um)
    console.log("bot moves:", botMoves);
    
    moveCount-=2
    console.log(moveCount);
    
    $board.find('.' + squareClass).removeClass('highlight-white');
    $board.find('.' + squareClass).removeClass('highlight-black');
    $board.find('.' + squareClass).removeClass('highlight-hint');

    // Undo twice: Opponent's latest move, followed by player's latest move
    undo();
    window.setTimeout(function () {
      undo();
      window.setTimeout(function () {
        showHint();
      }, 250);
    }, 250);
  } else {
    boardalert.style.display = "flex";
    boardtext.textContent = "Nothing to undo.";
  }
});

function redo() {
  game.move(undo_stack.pop());
  board.position(game.fen());
}

$('#redoBtn').on('click', function () {
  if (undo_stack.length >= 2) {
    
    let size = unstack.length;
    uselen = size - 1;
    botlen = size - 2;
    
    userMoves.push(unstack[uselen]);
    botMoves.push(unstack[botlen]);
    
    console.log("bot moves:", botMoves);
    console.log("User moves:", userMoves);
    
    moveCount+=2;
    console.log(moveCount);
    
    // Redo twice: Player's last move, followed by opponent's last move
    redo();
    window.setTimeout(function () {
      redo();
      window.setTimeout(function () {
        showHint();
      }, 250);
    }, 250);
  } else {
    boardalert.style.display = "flex";
    boardtext.textContent = "Nothing to redo.";
  }
});

$('#showHint').change(function () {
  window.setTimeout(showHint, 250);
});

function showHint() {
  var showHint = document.getElementById('showHint');
  $board.find('.' + squareClass).removeClass('highlight-hint');

  // Show hint (best move for white)
  if (showHint.checked) {
    var move = getBestMove(game, 'w', -globalSum)[0];

    $board.find('.square-' + move.from).addClass('highlight-hint');
    $board.find('.square-' + move.to).addClass('highlight-hint');
  }
}

/*
 * The remaining code is adapted from chessboard.js examples #5000 through #5005:
 * https://chessboardjs.com/examples#5000
 */
function removeGreySquares() {
  $('#myBoard .square-55d63').css('background', '');
}

function greySquare(square) {
  var $square = $('#myBoard .square-' + square);

  var background = whiteSquareGrey;
  if ($square.hasClass('black-3c85d')) {
    background = blackSquareGrey;
  }

  $square.css('background', background);
}

function onDragStart(source, piece) {
  // do not pick up pieces if the game is over
  if (game.game_over()) return false;

  // or if it's not that side's turn
  if (
    (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
    (game.turn() === 'b' && piece.search(/^w/) !== -1)
  ) {
    return false;
  }
}

let userMoves = [];

function onDrop(source, target) {
  removeGreySquares();
  
  // see if the move is legal
  var move = game.move({
    from: source,
    to: target,
    promotion: 'q', // NOTE: always promote to a queen for example simplicity
  });
  // Illegal move
  if (move === null) return 'snapback';
  
  globalSum = evaluateBoard(game, move, globalSum, 'b');
  updateAdvantage();

  // Highlight latest move
  $board.find('.' + squareClass).removeClass('highlight-white');

  $board.find('.square-' + move.from).addClass('highlight-white');
  squareToHighlight = move.to;
  colorToHighlight = 'white';
  
  userMoves.push(move.san); // Track the user's move
  console.log("User moves:", userMoves);
  onMove();
  $board
    .find('.square-' + squareToHighlight)
    .addClass('highlight-' + colorToHighlight);

  if (!checkStatus('black'));
  {
    // Make the best move for black
    window.setTimeout(function () {
      makeBestMove('b');
      window.setTimeout(function () {
        showHint();
      }, 250);
    }, 250);
  }
}

function onMouseoverSquare(square, piece) {
  // get list of possible moves for this square
  var moves = game.moves({
    square: square,
    verbose: true,
  });

  // exit if there are no moves available for this square
  if (moves.length === 0) return;

  // highlight the square they moused over
  greySquare(square);

  // highlight the possible squares for this piece
  for (var i = 0; i < moves.length; i++) {
    greySquare(moves[i].to);
  }
}

function onMouseoutSquare(square, piece) {
  removeGreySquares();
}

function onSnapEnd() {
  board.position(game.fen());
}

/////////////////////////////////////////////////////////////


// Generate the encryption key from moves
async function generateKeyFromMoves(userMoves, botMoves) {
  const combinedMoves = userMoves.concat(botMoves).join("");
  const msgUint8 = new TextEncoder().encode(combinedMoves);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  return hashBuffer.slice(0, 32); // AES key requires 256 bits
}

const uploadalert = document.querySelector('#uploadalert');
const boardalert = document.querySelector('#boardalert');
const boardtext = document.querySelector('#boardtext')
const uploadtext = document.querySelector('#uploadtext')
// Check if we can proceed with encryption/decryption based on move count

// Function to handle encryption
async function encryptFile() {
  
  const fileInput = document.getElementById("fileInput").files[0];
  document.getElementById('copyMovesButton').disabled = false;
  // Generate encryption key
  const keyBuffer = await generateKeyFromMoves(userMoves, botMoves);
  const key = await crypto.subtle.importKey("raw", keyBuffer, "AES-GCM", false, ["encrypt"]);

  const iv = crypto.getRandomValues(new Uint8Array(12)); // IV for AES-GCM

  const fileData = await fileInput.arrayBuffer();
  const encryptedData = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, fileData);

  const combined = new Uint8Array(iv.length + encryptedData.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encryptedData), iv.length);

  downloadFile(combined, "castlefile_" + fileInput.name + ".enc.txt");  
  
  resetAll();
  
}

// Function to handle decryption
async function decryptFile() {
  
  const fileInput = document.getElementById("fileInput").files[0];
  
  const keyBuffer = await generateKeyFromMoves(userMoves, botMoves);
  const key = await crypto.subtle.importKey("raw", keyBuffer, "AES-GCM", false, ["decrypt"]);

  const fileData = await fileInput.arrayBuffer();
  const iv = fileData.slice(0, 12); // First 12 bytes are the IV
  const encryptedData = fileData.slice(12);

  try {
    const decryptedData = await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(iv) }, key, encryptedData);
    downloadFile(decryptedData, fileInput.name.replace(".enc.txt", ""));
    
    resetAll();
  } catch (error) {
    boardalert.style.display = "flex";
    boardtext.textContent = "Decryption Failed. Ensure the same opening was played.";
  }
}

function downloadFile(data, filename) {
    try {
        const blob = new Blob([data], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);

        // Trigger download
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        // Clean up
        document.body.removeChild(a);
        URL.revokeObjectURL(url); // Revoke the Blob URL after use
        console.log("File downloaded successfully:", filename);
    } catch (error) {
        console.error("Download error:", error);
        alert("Download failed. Please try again.");
    }
}

function copyGameNotation() {
    // Get all moves in Standard Algebraic Notation (SAN)
    const moves = game.history({ verbose: true });
    let notationList = '';

    // Format moves in pairs (1.e4 e5, 2.Nf3 Nc6, etc.)
    for (let i = 0; i < moves.length; i += 2) {
        const moveNumber = Math.floor(i / 2) + 1;
        const whiteMove = moves[i].san;
        const blackMove = moves[i + 1] ? moves[i + 1].san : ''; // Check if black move exists
        notationList += `${moveNumber}. ${whiteMove} ${blackMove}\n`;
    }

    // Copy to clipboard
    navigator.clipboard.writeText(notationList)
        .then(() => {
            const copytext = document.querySelector("#copytext")
            const copiedicon = document.querySelector("#copiedicon");
            const copyicon = document.querySelector("#copyicon")
            const copiedtext = document.querySelector("#copiedtext");
            
            copiedtext.style.display = "block";
            copytext.style.display = "none";
            copiedicon.style.display = "block";
            copyicon.style.display = "none";

            // Hide message after 5 seconds
            setTimeout(() => {
                copytext.style.display = "block"
                copiedicon.style.display = "none";
                copyicon.style.display = "block"
                copiedtext.style.display = "none";
            }, 5000);
        })
        .catch((err) => {
            console.error('Failed to copy moves:', err);
        });
}

// Call this function whenever you want to copy the moves
// Example: After game ends or on a button click
document.getElementById("copyMovesButton").addEventListener("click", copyGameNotation);


// Function to check move count and update UI accordingly

// Function to make pieces undraggable



let moveCount = 0;
const minMoves = 4;
const maxMoves = 16;

document.getElementById("encrypt").disabled = true;
document.getElementById("undoBtn").disabled = true;
document.getElementById("redoBtn").disabled = true;
document.getElementById("decrypt").disabled = true;
document.getElementById('copyMovesButton').disabled = true;

function resetAll() {

  // Reset board state
  game.reset();
  $board.find('.' + squareClass).removeClass('highlight-white');
  $board.find('.' + squareClass).removeClass('highlight-black');
  $board.find('.' + squareClass).removeClass('highlight-hint');
  board.position(game.fen());
  globalSum = 0;
  moveCount = 0;
  userMoves = [];
  botMoves = [];

  // Reset UI elements
  uploadalert.style.display = "none";
  uploadtext.textContent = "";

  // Disable buttons (if any are active)
  document.getElementById("copyMovesButton").disabled = true;
  document.getElementById("encrypt").disabled = true;
  document.getElementById("undoBtn").disabled = true;
  document.getElementById("redoBtn").disabled = true;
  document.getElementById("decrypt").disabled = true;
  document.getElementById('copyMovesButton').disabled = true;

  const fileInput = document.getElementById("fileInput");
  if (fileInput) {
    fileInput.value = ""; 
    document.querySelector(".filename").textContent = "Browse File";
    document.querySelector("#fileicon").style.display = "none";
    document.querySelector("#uploadfileicon").style.display = "block";
  }
  makePiecesUndraggable();
}


function onMove() {
    moveCount+=1;
    console.log("move:",moveCount)
    if (moveCount === minMoves) {
        // Enable encryption and decryption buttons
        document.getElementById("encrypt").disabled = false;
        document.getElementById("decrypt").disabled = false;
        document.getElementById('copyMovesButton').disabled = false;
    }
    if (moveCount === 1) {
      document.getElementById("undoBtn").disabled = false;
      document.getElementById("redoBtn").disabled = false;
    }
    
    if (moveCount >= maxMoves) {
        footer.style.display = "block";
      	features.style.display = "flex";
        homeDiv.style.marginBottom = "3rem";
        setTimeout(() => {
            makePiecesUndraggable();
        }, 300);
        
        boardalert.style.display = "flex";
        boardtext.textContent = "Maximum moves limit reached.";
    }

    
}

const homeDiv = document.querySelector(".home");
const footer = document.querySelector("footer");
const features= document.querySelector(".features");

// Enable the board for interaction
function enableBoard() {
 // Destroy current instance
  footer.style.display = "none";
  features.style.display = "none";
  homeDiv.style.marginBottom = "0";
  
  if (moveCount === 0) {
    
    board = Chessboard('myBoard', {
      position: 'start', // retain the current position
      draggable: true, // enable dragging
      onDragStart: onDragStart,
      onDrop: onDrop,
      onMouseoutSquare: onMouseoutSquare,
      onMouseoverSquare: onMouseoverSquare,
    });
    console.log("board enabled")
  }
  
}

// Disable the board to prevent further moves
function makePiecesUndraggable() {
  footer.style.display = "block";
  homeDiv.style.marginBottom = "3rem";
  
  board = Chessboard('myBoard', {
  position: board.fen(), // retain the current position
  draggable: false,
  onDragStart: onDragStart,
  onDrop: onDrop,
  onMouseoutSquare: onMouseoutSquare,
  onMouseoverSquare: onMouseoverSquare,
  onSnapEnd: onSnapEnd,
  });
  console.log('board disabled')
}


// Adjust UI for encryption mode
function encryption() {
  document.querySelector(".enc-heading").textContent = "Chess-based File Encryption";
  document.querySelector(".play").textContent = "Play Chess to Encrypt Your File";
  document.getElementById('copyMovesButton').style.display = 'flex';
  document.getElementById('encrypt').style.display = 'flex';
  document.getElementById('decrypt').style.display = 'none';
  document.querySelector(".decryption").style.background = 'none';
  document.querySelector(".encryption").style.background = '#121212';
  
  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];
  console.log('encryption');
  if (file) {
    if (file.name.endsWith('.enc.txt')) {
      decryption();
    } else {
      if (moveCount === maxMoves) {
        makePiecesUndraggable();
      }
      if(moveCount === 0) {
        enableBoard();
      }
      
    }
  }
}

// Adjust UI for decryption mode
function decryption() {
  document.querySelector(".enc-heading").textContent = "Chess-based File Decryption";
  document.querySelector(".play").textContent = "Play Chess to Decrypt Your File";

  document.getElementById('encrypt').style.display = 'none';
  document.getElementById('decrypt').style.display = 'flex';
  document.querySelector(".encryption").style.background = 'none';
  document.querySelector(".decryption").style.background = '#121212';
  document.getElementById('copyMovesButton').style.display = 'none';
  
  console.log('decryption')
  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];

  if (file) {
    if (file.name.endsWith('.enc.txt')) {
      if (moveCount === maxMoves) {
        makePiecesUndraggable();
      }
      if(moveCount === 0) {
        enableBoard();
      }
    } 
    else {
      encryption();
    }
  }
}

// Setup file input event
document.querySelector("#fileInput").onchange = function() {
    if (this.files.length > 0) {
      console.log('filequery')
        document.querySelector(".filename").textContent = this.files[0].name;
        document.querySelector("#fileicon").style.display = "block";
        document.querySelector("#uploadfileicon").style.display = "none";

        const isEncrypted = fileInput.name.endsWith('.enc.txt');

        if (isEncrypted) {
          if (moveCount === maxMoves) {
            makePiecesUndraggable();
          }
          else{
           decryption();
          }
            
        } 
        else {
          if (moveCount === maxMoves) {
            makePiecesUndraggable();
          }
          else {
            encryption(); 
          }
        }
    }
};

const menu = document.querySelector(".menu-btn i").addEventListener("click", () => {
  document.querySelector(".navbar .menu").classList.toggle("active");
  document.querySelector(".menu-btn i").classList.toggle("active");
  document.querySelector(".navbar .max-width .menu .inaclogo").classList.toggle("aclogo");
});
