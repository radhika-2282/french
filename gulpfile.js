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

// Initialize BrowserSync instance
const browserSync = browserSyncLib.create();
// Set the TTS language
const gTTS = new gTTSLib('fr');

const imageExts = '{ico,jpg,jpeg,png,gif,svg,webp}'

function getTextHash(text) {
  return crypto.createHash("md5").update(text, "utf-8").digest("hex");
}

function reloadBrowser(done) {
  browserSync.reload();
  done();
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
    .pipe(through2.obj(function(file, _ , cb){
      
      let content = file.contents.toString();
      let pattern = /speak\((['"])(.*?)(?<!\\)\1[^)]*\)/g;
      const matches = [...content.matchAll(pattern)];
      console.log(`Scanning: ${file.basename}`);
      let same = 0;
      for (const match of matches) {
        const rawText = match[2];
        // Clean up escape slashes so gTTS reads it naturally
        const textToSpeak = rawText.replace(/\\'/g, "'").replace(/\\"/g, '"').trim();
        if (!textToSpeak) continue;

        // set up variables
        const textHash = getTextHash(textToSpeak);
        const audioFileName = `${textHash}.mp3`;
        const audioPath = path.join('assets/voices', audioFileName);

        if (!fs.existsSync(audioPath)) {
          console.log(`Generating audio for: ${textToSpeak}`);
          gTTS.save(audioPath, textToSpeak)
        } else {
          same++
        }
      }
      
      console.log(`--> Skipping ${same} audio files`)
      this.push(file); // continue the stream
      cb();
    }))
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

  gulp.watch(['index.html']).on("change", (path)=>{
    console.log(path)
    return gulp.series(()=>{gulp.src(path)
    .pipe(fileInclude({
      prefix: '@@',
      basepath: '@file'
    }))
    .pipe(gulp.dest("dist"))}, reloadBrowser);
  });
  
  gulp.watch(['lesson*/*.html']).on("change", (filePath)=>{
    let lesson = path.dirname(filePath);
    let subIndex = path.join(lesson, 'index.html');
    console.log(filePath)
    return gulp.series(()=>{gulp.src(subIndex)
    .pipe(fileInclude({
      prefix: '@@',
      basepath: '@file'
    }))
    .pipe(through2.obj(function(file, _ , cb){
      
      let content = file.contents.toString();
      let pattern = /speak\((['"])(.*?)(?<!\\)\1[^)]*\)/g;
      const matches = [...content.matchAll(pattern)];
      console.log(`Scanning: ${file.basename}`);
      let same = 0;
      for (const match of matches) {
        const rawText = match[2];
        // Clean up escape slashes so gTTS reads it naturally
        const textToSpeak = rawText.replace(/\\'/g, "'").replace(/\\"/g, '"').trim();
        if (!textToSpeak) continue;

        // set up variables
        const textHash = getTextHash(textToSpeak);
        const audioFileName = `${textHash}.mp3`;
        const audioPath = path.join('assets/voices', audioFileName);

        if (!fs.existsSync(audioPath)) {
          console.log(`Generating audio for: ${textToSpeak}`);
          gTTS.save(audioPath, textToSpeak)
          // inline copy to dist/voices to save time
          
          fs.copyFileSync(audioPath, `/dist/voices/${audioFileName}`)
        } else {
          same++
        }
      }
      
      console.log(`--> Skipping ${same} audio files`)
      this.push(file); // continue the stream
      cb();
    }))
    .pipe(gulp.dest(`dist/${lesson+".html"}`))},
    reloadBrowser);
  });

  gulp.watch(['assets/**/*','!assets/voices/*']).on("change", (filePath)=>{
    console.log(filePath)
    return gulp.series(()=>{gulp.src(filePath)
    .pipe(gulp.parallel(
      ()=>{
        return gulp.src([`assets/**/*`,`!assets/**/*.${imageExts}`])
        .pipe(gulp.dest('dist'));
      },
      ()=>{
        return gulp.src([`assets/**/*.${imageExts}`], { encoding: false })
        .pipe(gulp.dest('dist'));
      }
    ))}
    , reloadBrowser);
  });
}



export function cleanDist() {
  return deleteAsync(['dist/**/*']);
}

function copyOthers() {
  return gulp.src([`assets/**/*`,`!assets/**/*.${imageExts}`])
    .pipe(gulp.dest('dist'));
}

function copyImages() {
  return gulp.src([`assets/**/*.${imageExts}`], { encoding: false })
    .pipe(gulp.dest('dist'));
}

let copyAssets = gulp.parallel(copyImages, copyOthers)


export const build = gulp.series(
  cleanDist,
  gulp.parallel(
    processHTML,
    copyAssets,
  )
);

export default dev;