import * as core from '@actions/core';
import * as io from '@actions/io';
import * as tc from '@actions/tool-cache';
import * as exec from '@actions/exec';
const path = require("path");
const sha1File = require('sha1-file')

const IS_WINDOWS = process.platform === 'win32';
const IS_MACOS = process.platform === 'darwin';

const scripts_base_url        = "https://raw.githubusercontent.com/AdaCore/gnat_community_install_script/master/";
const install_script_qs_url   = scripts_base_url + "install_script.qs";
const install_package_sh_url  = scripts_base_url + "install_package.sh";

const community_configs = require('../src/community_configs.json')

async function download(url, dest) {
    console.log("Downloading '" + url + "' -> '" + dest + "'")
    var fileName = await tc.downloadTool(url);
    await io.mv(fileName, dest);
};

//  Fetch directory where libgcc.a is located. This looks like
//  <prefix>/lib/gcc/x86_64-pc-linux-gnu/8.3.1
async function getGccDirectory(gcc) {
    let gccOutput = '';
    let options = {
        listeners: {
            stdout: (data: Buffer) => { gccOutput += data.toString(); }
        }
    };
    await exec.exec(gcc, ['-print-libgcc-file-name'], options);
    return path.dirname(gccOutput);
};

async function setLdPath(installDir, name, extra_segment) {
    const gcc_path = await getGccDirectory(path.join(installDir, 'bin', 'gcc'));
    const adalib = path.join(gcc_path, extra_segment, 'adalib');
    const libDir = path.join(installDir, 'lib');
    const oldValue = (name in process.env) ? process.env[name] + ':' : '';
    console.log(`Export ${name}=${oldValue}${libDir}:${adalib}`)
    core.exportVariable(name, `${oldValue}${libDir}:${adalib}`);
}

async function installGNATCommunity (year : string, target : string) {

    if (!community_configs[process.platform]) {
        core.setFailed(`Unknown platform '${process.platform}' for GNAT community`);
        return;
    }

    if (!community_configs[process.platform][year]) {
        core.setFailed(`Unknown year '${year}' for GNAT community ${process.platform}`);
        return;
    }

    const release = community_configs[process.platform][year][target]
    if (!release) {
        core.setFailed(`Unknown target '${target}' for GNAT community ${process.platform}.${year}`);
        return;
    }

    var pack = release.pack;
    var url = release.url;
    var sha1 = release.sha1;

    console.log("Downloading '" + url + "'");
    const dlFile = await tc.downloadTool(url);

    if (sha1File(dlFile) != sha1) {
        core.setFailed("Invalid checksum on downloaded package");
        return;
    }
        
    const tmpDir = path.dirname(dlFile);
    const installDir = path.join (tmpDir, pack);
    const script_qs = path.join (tmpDir, "install_script.qs");
    const script_sh = path.join (tmpDir, "install_package.sh");

    console.log("Installing: '" + dlFile + "' in '" + installDir + "'")

    await download(install_script_qs_url, script_qs);

    if (IS_WINDOWS) {
        await io.mv(dlFile, pack + ".exe");
        await exec.exec(`${pack}.exe --verbose --script ${script_qs} InstallPrefix=${installDir}`);
    } else {

        await download(install_package_sh_url, script_sh);

        if (IS_MACOS) {
            await io.mv(dlFile, pack + ".dmg");
            await exec.exec(`sh ${script_sh} ${pack}.dmg ${installDir}`);
            setLdPath(installDir, 'DYLD_LIBRARY_PATH', 'rts-native');
        } else {
            await exec.exec(`sh ${script_sh} ${dlFile} ${installDir}`);
            setLdPath(installDir, 'LD_LIBRARY_PATH', '');
        }
    }

    core.addPath(path.join(installDir, 'bin'));
}

async function installGNATFSF (target : string) {
    if (process.platform != 'linux') {
        core.setFailed(`GNAT FSF not available on ${process.platform}`);
        return;
    }

    if (target != 'native') {
        core.setFailed(`Unknown target '${target}' for GNAT FSF ${process.platform}`);
        return;
    }

    await exec.exec('sudo apt install gnat gprbuild');
}

async function run() {
    try {
        const distrib = core.getInput('distrib');
        const target = core.getInput('target');
        
        switch(distrib) {
        case "fsf":
            await installGNATFSF(target);
            break;
        case "community":
            const year = core.getInput('community_year');
            await installGNATCommunity(year, target);
            break;
        default:
            core.setFailed(`Unknown distrib: '${distrib}'`)
        }
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
