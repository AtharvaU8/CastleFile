const boardalert = document.querySelector('#boardalert');
const textalert = document.querySelector('#textalert');

const copyBtn = document.getElementById('copyMovesButton');
const copytext = document.querySelector("#copytext")
const copiedicon = document.querySelector("#copiedicon");
const copyicon = document.querySelector("#copyicon")
const copiedtext = document.querySelector("#copiedtext");

const encryptBtn =  document.getElementById("encrypt");
const undoBtn = document.getElementById("undoBtn");
const redoBth = document.getElementById("redoBtn");
const decryptBtn = document.getElementById("decrypt");


// Generate the encryption key from moves
async function generateKeyFromMoves(userMoves, botMoves) {
  const combinedMoves = userMoves.concat(botMoves).join("");
  const msgUint8 = new TextEncoder().encode(combinedMoves);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  return hashBuffer.slice(0, 32); // AES key requires 256 bits
}

// Check if we can proceed with encryption/decryption based on move count

// Function to handle encryption
async function encryptFile() {
  
  const fileInput = document.getElementById("fileInput").files[0];
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
    
   
  } catch (error) {
    boardalert.style.display = "flex";
    textalert.textContent = "Decryption Failed. Ensure the same opening was played.";
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



let moveCount = 0;
const minMoves = 4;
const maxMoves = 16;

encryptBtn.disabled = true;
undoBtn.disabled = true;
redoBtn.disabled = true;
decryptBtn.disabled = true;
copyBtn.disabled = true;

function resetAll() {

  // Reset board state
  game.reset();
  $board.find('.' + squareClass).removeClass('highlight-white');
  $board.find('.' + squareClass).removeClass('highlight-black');
  $board.find('.' + squareClass).removeClass('highlight-hint');
  board.position(game.fen());
  document.querySelector("#status").textContent = "No check, checkmate, or draw.";
  globalSum = 0;
  moveCount = 0;
  userMoves = [];
  botMoves = [];

  // Reset UI elements
  boardalert.style.display = "none";
  textalert.textContent = "";

  // Disable buttons (if any are active)
  copyBtn.disabled = true;
  encryptBtn.disabled = true;
  undoBtn.disabled = true;
  redoBtn.disabled = true;
  decryptBtn.disabled = true;
  copyBtn.disabled = true;

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
        encryptBtn.disabled = false;
        decryptBtn.disabled = false;
        copyBtn.disabled = false;
    }
    if (moveCount === 1) {
      document.getElementById("undoBtn").disabled = false;
      document.getElementById("redoBtn").disabled = false;
    }
    
}

// Enable the board for interaction
function enableBoard() {
 // Destroy current instance
  
  if (moveCount === 0) {
    
    board = Chessboard('myBoard', {
      position: 'start', // retain the current position
      draggable: true, // enable dragging
      onDragStart: onDragStart,
      onDrop: onDrop,
      onMouseoutSquare: onMouseoutSquare,
      onMouseoverSquare: onMouseoverSquare,
      pieceTheme: "assets/img/chesspieces/wikipedia/{piece}.png"
    });
  }
  
}

// Disable the board to prevent further moves
function makePiecesUndraggable() {
  
  board = Chessboard('myBoard', {
  position: board.fen(), // retain the current position
  draggable: false,
  onDragStart: onDragStart,
  onDrop: onDrop,
  onMouseoutSquare: onMouseoutSquare,
  onMouseoverSquare: onMouseoverSquare,
  onSnapEnd: onSnapEnd,
  pieceTheme: "assets/img/chesspieces/wikipedia/{piece}.png"
  });
}


// Adjust UI for encryption mode
function encryption() {
  copyBtn.disabled = false;
  encryptBtn.style.display = 'flex';
  decryptBtn.style.display = 'none';
  
  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];
  if (file) {
    if (file.name.endsWith('.enc.txt')) {
      decryption();
    } else {
      	if(moveCount === 0) {
        	enableBoard();
      	}
      
    }
  }
}

// Adjust UI for decryption mode
function decryption() {
  encryptBtn.style.display = 'none';
  decryptBtn.style.display = 'flex';
  copyBtn.disabled = true;
  
  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];

  if (file) {
    if (file.name.endsWith('.enc.txt')) {
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
           decryption();        
        } 
        else {       
            encryption(); 
        }
    }
};

document.addEventListener("DOMContentLoaded", () => {
  // Select all FAQ question elements
  const faqItems = document.querySelectorAll(".faq-item");

  // Toggle expand/collapse on click
  faqItems.forEach((item) => {
    const question = item.querySelector(".faq-question");
    question.addEventListener("click", () => {
      item.classList.toggle("active");
    });
  });
});

const menu = document.querySelector(".menu-btn i").addEventListener("click", () => {
  document.querySelector(".navbar .menu").classList.toggle("active");
  document.querySelector(".menu-btn i").classList.toggle("active");
  document.querySelector(".navbar .max-width .menu .inaclogo").classList.toggle("aclogo");
});
