#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const https = require("https");
const yauzl = require("yauzl");
const Downloader = require("nodejs-file-downloader");

const VERBOSE = true;
const URL = "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip";
const MODEL_DIR = path.resolve(__dirname, "..", "model");

(async () => {
    if (!fs.existsSync(MODEL_DIR)) {
        fs.mkdirSync(MODEL_DIR, { recursive: true });
    }

    if (fs.existsSync(path.resolve(MODEL_DIR, "DONE"))) {
        VERBOSE && console.log("Model already downloaded");
        return;
    }
    const downloader = new Downloader({
        url: URL,
        directory: MODEL_DIR
    });
    const { filePath } = await downloader.download();
    VERBOSE && console.log("Downloaded model to", MODEL_DIR);
    await unzip(filePath, MODEL_DIR);
    fs.unlinkSync(filePath)
})();

function unzip(zip, dest) {
    const dir = path.basename(zip, ".zip");
    return new Promise((resolve, reject) => {
        yauzl.open(zip, { lazyEntries: true }, (err, zipfile) => {
            if (err) {
                reject(err);
            }
            zipfile.readEntry();
            zipfile
                .on("entry", (entry) => {
                    if (/\/$/.test(entry.fileName)) {
                        zipfile.readEntry();
                    } else {
                        zipfile.openReadStream(entry, (err, stream) => {
                            if (err) {
                                reject(err);
                            }
                            const f = path.resolve(dest, entry.fileName.replace(`${dir}/`, ""));
                            if (!fs.existsSync(path.dirname(f))) {
                                fs.mkdirSync(path.dirname(f), { recursive: true });
                                VERBOSE && console.log("Created directory", path.dirname(f));
                            }
                            stream.pipe(fs.createWriteStream(f));
                            stream
                                .on("end", () => {
                                    VERBOSE && console.log("Extracted", f);
                                    zipfile.readEntry();
                                })
                                .on("error", (err) => {
                                    reject(err);
                                });
                        });
                    }
                })
                .on("error", (err) => {
                    reject(err);
                })
                .on("end", () => {
                    VERBOSE && console.log("Extracted all files");
                    fs.writeFileSync(path.resolve(dest, "DONE"), "");
                })
                .on("close", () => {
                    resolve();
                });
        });
    });
}
