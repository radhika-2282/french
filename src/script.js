import { md5 } from 'https://cdn.jsdelivr.net/npm/js-md5@0.8.3/+esm'
function speak(word) {
    let fileHash = md5(word);
    // 1. Construct the path to the voice file
    // Assumes 'public' is the root directory of your web server
    const audioPath = `/voices/${fileHash}.mp3`;

    // 2. Create a new Audio object and play it
    const audio = new Audio(audioPath);
    audio.play().catch(e => {
        if(e.code == 9) {
            speakWithBrowserVoice(word)
        } else if (e.code == 0) {
            console.log("user didn't interact with page")
        } else {
            console.error(`failed to play = ${word}`)
            console.error(e)
        }
    });
        
}

function speakWithBrowserVoice(text) {
    if (!('speechSynthesis' in window)) return;
    
    console.warn("Fatal! using browser fallback")
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.95;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
}

window.speak = speak;
speak(document.body.dataset.name)

