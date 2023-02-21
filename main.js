async function main () {
    try {
      const buttonStart = document.querySelector('#buttonStart')
      const buttonStop = document.querySelector('#buttonStop')
      const audio = document.querySelector('#audio')
  
      const stream = await navigator.mediaDevices.getUserMedia({ // <1>
        vide: false,
        audio: true,
      })
  
      const [track] = stream.getAudioTracks()
      const settings = track.getSettings() // <2>
  
      const audioContext = new AudioContext() 
      await audioContext.audioWorklet.addModule('audio-recorder.js') // <3>
  
      const mediaStreamSource = audioContext.createMediaStreamSource(stream) // <4>
      const audioRecorder = new AudioWorkletNode(audioContext, 'audio-recorder') // <5>
      const buffers = []
  
      audioRecorder.port.addEventListener('message', event => { // <6>
        buffers.push(event.data.buffer)
      })
      audioRecorder.port.start() // <7>
      
      mediaStreamSource.connect(audioRecorder) // <8>
      audioRecorder.connect(audioContext.destination)
  
      buttonStart.addEventListener('click', event => {
        buttonStart.setAttribute('disabled', 'disabled')
        buttonStop.removeAttribute('disabled')
  
        const parameter = audioRecorder.parameters.get('isRecording')
        parameter.setValueAtTime(1, audioContext.currentTime) // <9>
        
        buffers.splice(0, buffers.length)
    })
    
    buttonStop.addEventListener('click', async event => {

        // prepare(buffers,audioRecorder.context.sampleRate) 
        buttonStop.setAttribute('disabled', 'disabled')
        buttonStart.removeAttribute('disabled')
  
        const parameter = audioRecorder.parameters.get('isRecording')
        parameter.setValueAtTime(0, audioContext.currentTime) // <10>
  
        const blob = encodeAudio(buffers, settings) // <11>
        const url = URL.createObjectURL(blob)
        audio.src = url

        console.log(blob);
        
        async function blobToArrayBuffer(blob) {
            if ('arrayBuffer' in blob) return await blob.arrayBuffer();
            
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject();
                reader.readAsArrayBuffer(blob);
            });
        }
        blobToArrayBuffer(blob);
        prepare(blob);
        
        
      })
    } catch (err) {
      console.error(err)
    }
  }
  
  //////////////////////////////////////////////////////////////////////////

const recorder = document.getElementById('recorder');
const player = document.getElementById('player');



function prepare(buffer) {
var offlineContext = new OfflineAudioContext(1, buffer.length, 48000);
var source = offlineContext.createBufferSource();
source.buffer = buffer;
var filter = offlineContext.createBiquadFilter();
filter.type = "lowpass";
filter.frequency.value = 400;
source.connect(filter);
filter.connect(offlineContext.destination);
source.start(0);
offlineContext.startRendering();
offlineContext.oncomplete = function(e) {
process(e);
};
}

function process(e) {
var filteredBuffer = e.renderedBuffer;
//If you want to analyze both channels, use the other channel later
var data = filteredBuffer.getChannelData(0);
var max = arrayMax(data);
var min = arrayMin(data);
var threshold = min + (max - min) * 0.85;
var peaks = getPeaksAtThreshold(data, threshold);
var intervalCounts = countIntervalsBetweenNearbyPeaks(peaks);
var tempoCounts = groupNeighborsByTempo(intervalCounts);
tempoCounts.sort(function(a, b) {
return b.count - a.count;
});
console.log(tempoCounts[0])
if (tempoCounts.length) {
output.innerHTML = tempoCounts[0].tempo;
}
}

// http://tech.beatport.com/2014/web-audio/beat-detection-using-web-audio/
function getPeaksAtThreshold(data, threshold) {
var peaksArray = [];
var length = data.length;
for (var i = 0; i < length;) {
if (data[i] > threshold) {
peaksArray.push(i);
// Skip forward ~ 1/4s to get past this peak.
i += 10000;
}
i++;
}
return peaksArray;
}

function countIntervalsBetweenNearbyPeaks(peaks) {
var intervalCounts = [];
peaks.forEach(function(peak, index) {
for (var i = 0; i < 10; i++) {
var interval = peaks[index + i] - peak;
var foundInterval = intervalCounts.some(function(intervalCount) {
  if (intervalCount.interval === interval) return intervalCount.count++;
});
//Additional checks to avoid infinite loops in later processing
if (!isNaN(interval) && interval !== 0 && !foundInterval) {
  intervalCounts.push({
    interval: interval,
    count: 1
  });
}
}
});
return intervalCounts;
}

function groupNeighborsByTempo(intervalCounts) {
var tempoCounts = [];
intervalCounts.forEach(function(intervalCount) {
//Convert an interval to tempo
var theoreticalTempo = 60 / (intervalCount.interval / 44100);
theoreticalTempo = Math.round(theoreticalTempo);
if (theoreticalTempo === 0) {
return;
}
// Adjust the tempo to fit within the 90-180 BPM range
while (theoreticalTempo < 90) theoreticalTempo *= 2;
while (theoreticalTempo > 180) theoreticalTempo /= 2;

var foundTempo = tempoCounts.some(function(tempoCount) {
if (tempoCount.tempo === theoreticalTempo) return tempoCount.count += intervalCount.count;
});
if (!foundTempo) {
tempoCounts.push({
  tempo: theoreticalTempo,
  count: intervalCount.count
});
}
});
return tempoCounts;
}

// http://stackoverflow.com/questions/1669190/javascript-min-max-array-values
function arrayMin(arr) {
var len = arr.length,
min = Infinity;
while (len--) {
if (arr[len] < min) {
min = arr[len];
}
}
return min;
}

function arrayMax(arr) {
var len = arr.length,
max = -Infinity;
while (len--) {
if (arr[len] > max) {
max = arr[len];
}
}
return max;
}
  main()