import parse from './../index.js';
import fs from 'node:fs';
import path from 'node:path';


//const profileData = fs.readFileSync('./fixtures/USWebCoatedSWOP.icc');




//const profile = parse(profileData);
const removeBuffers = (profile) => {
    const table = profile.tagTable.map(([tag, type, buffer, offset, length], key) => [{ key, tag, type, offset, length }][0])
    profile.tagTable = table;
    for (const value of Object.values(profile)) {
        if (value instanceof Object) {
            if ('clut' in value) {
                delete value.clut
            }
            if ('inputTables' in value) {
                delete value.inputTables
            }
            if ('outputTables' in value) {
                delete value.outputTables
            }
            if ('slice' in value) {
                delete value.slice
            }
        }
        //console.log({value})
    }
    return profile
}
//console.log(profile)

//const jsonICC = JSON.stringify(profile, null, '   ');
//console.log(jsonICC)
//console.dir(profile);


const files = [
    'D65_XYZ.icc',
    'ILFORD_CANpro-4000_GPGFG_ProPlatin.icc',
    'sRGB_IEC61966-2-1_black_scaled.icc',
    'USWebCoatedSWOP.icc'
]
    .map(fname => path.join('./../','test', 'fixtures', fname))

   files .map(pth => fs.readFileSync(pth))
    .map(parse)
    .map(removeBuffers)
    .map(obj => JSON.stringify(obj, null, '   '))
    .map((json, i) => fs.writeFileSync(files[i] + '.json', Buffer.from(json)))
    