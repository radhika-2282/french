import gulp from 'gulp';
import fileInclude from 'gulp-file-include';
import rename from 'gulp-rename';
import {deleteAsync} from 'del';   
import through2 from 'through2';
import crypto from 'crypto';
import fs from "fs"
import path from "path";
import gTTSLib from 'node-gtts';
import browserSyncLib from 'browser-sync';


// the entry point is index.html
// all other folders will be compressed into files


// Preferences
let delay = 500;
const sourceDir = 'assets';
const destDir = 'dist';
const pattern = /speak\((['"])(.*?)(?<!\\)\1[^)]*\)/g;


const browserSync = browserSyncLib.create();
const gTTS = new gTTSLib('fr');


function copyAssets (cb) {
  fs.cp(sourceDir, destDir, { recursive: true }, (err) => {
    if (err) {
      cb(err); 
    } else {
      cb(); 
    }
  });
}

function reloadBrowser() {
  console.log('Reloading browser...');
  browserSync.reload();
}

function getTextHash(text) {
  return crypto.createHash("md5").update(text, "utf-8").digest("hex");
}

export function cleanDist() {
  return deleteAsync(['dist/**/*']);
}

function generateVoiceAssets(options = {}){
  const { copy = false } = options;
  return function (file, _ , cb) {
    //defining matches
    let content = file.contents.toString();
    const matches = [...content.matchAll(pattern)];

    console.log(`Scanning: ${file.path}`);
    let same = 0;

    //  logic per match
    for (const match of matches) {
      // take the second match from the pattern
      // this is due to the odd nature of the regex
      const rawText = match[2]; 
      // Clean up escape slashes so gTTS reads it naturally
      const textToSpeak = rawText.replace(/\\'/g, "'").replace(/\\"/g, '"').trim();

      if (!textToSpeak) continue;

      // set up variables
      const textHash = getTextHash(textToSpeak);
      const audioPath = path.join('assets/voices', `${textHash}.mp3`);

      if (!fs.existsSync(audioPath)) {
        console.log(`Generating audio for: ${textToSpeak}`);
        console.log(`with hash ${textHash}`)
        gTTS.save(audioPath, textToSpeak)
        if (copy) {
          fs.copyFileSync(audioPath, `dist/voices/${textHash}.mp3`);
        }
      } else {
        same++
      }
    }
    console.log(`--> Skipping ${same} audio files`)
    this.push(file); // continue the stream
    cb();
  }
}

function processHTML() {
  return gulp.src(['index.html', 'lesson*/index.html'])
    .pipe(fileInclude({
      prefix: '@@',
      basepath: '@file'
    }))
    .pipe(rename((path) => {
      // For lesson folders (e.g. path.dirname = "lesson1"), rename to "lesson1.html"
      // For root index.html (path.dirname = "."), keep the name as "index.html"
      if (path.dirname !== '.') {
        path.basename = path.dirname;
        path.dirname = '';
      }
    }))
    .pipe(through2.obj(generateVoiceAssets()))
    .pipe(gulp.dest('dist'));
    
}


export function dev () {
  browserSync.init({
    server: {
      baseDir: "dist"
    },
    port: 8085,
    notify: false
  });


  gulp.watch(['index.html'],{ delay: delay }).on("change", (path)=>{
    console.log(path)
    return gulp.src(path)
    .pipe(fileInclude({
      prefix: '@@',
      basepath: '@file'
    }))
    .pipe(through2.obj(generateVoiceAssets({copy: true})))
    .pipe(gulp.dest("dist"))
    .on('end', reloadBrowser)
  });   
  
  gulp.watch(['lesson*/*.html'],{ delay: delay }).on("change", (filePath)=>{
    let lesson = path.dirname(filePath);
    let subIndex = path.join(lesson, 'index.html');
    console.log(filePath)
    return gulp.src(subIndex)
    .pipe(fileInclude({
      prefix: '@@',
      basepath: '@file'
    }))
    .pipe(through2.obj(generateVoiceAssets({copy: true})))
    .pipe(rename((path) => {
      // rename to "lesson*.html"
      path.basename = lesson;
    }))
    .pipe(gulp.dest(`dist`))
    .on('end', reloadBrowser)
  });

  gulp.watch(['assets/**/*','!assets/voices/*'],{ delay: delay }).on("change", async (filePath)=>{
    console.log(`${filePath}: changed`)
    await fs.promises.copyFile(filePath, `dist/${filePath}`);
    reloadBrowser();
  });
}


export const build = gulp.series(
  cleanDist,
  gulp.parallel(
    processHTML,
    copyAssets,
  )
);

export default dev;