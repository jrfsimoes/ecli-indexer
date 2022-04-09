const getUrl = (off=0, pp=100) => `https://jurisprudencia.csm.org.pt/items/loadItems?sorts%5BdataAcordao%5D=1&perPage=${pp}&offset=${off}`
const ECLI = require('./util/ecli');
const { init, index, exists } = require('./indexer');
const fetch = require('./util/fetch');
const url2Table = require('./url-to-table');
const { strip_empty_html } = require('./util/html');

const IGNORE_KEYS = ["", "1", "Texto Integral", "Decisão Texto Integral", "Decisão", "Nº Convencional", "Privacidade", "Nº do Documento"]

init().then( async _ => forEachCSMRecord(async record => {
    let Tribunal = record.tribunal;
    let ecli = ECLI.fromString(record.ecli);
    let link = `https://jurisprudencia.csm.org.pt/ecli/${record.ecli}/`;
    let table = await url2Table(`https://jurisprudencia.csm.org.pt/ecli/${record.ecli}/`);
    
    let processo = table.Processo.textContent.trim().replace(/\s-\s.*$/, "").replace(/ver\s.*/, "");
    if( await exists({"Tribunal": Tribunal,"Processo": processo, "Origem": "csm-indexer"}) ){
        return;
    }
    try{
        if( ecli.setNumber(processo).build() != record.ecli ){
            console.log(`${record.ecli} - ${processo} - ${ecli.build()}`);
        }
        let body = {
            "ECLI": ecli.build(),
            "Tribunal": Tribunal,
            "Processo": processo,
            "Relator": table.Relator.textContent.trim(),
            "Data": getData(table),
            "Descritores": getDescritores(table),
            "Sumário": getSumario(table),
            "Texto": getTexto(table),
            "Tipo": "Acórdão",
            "Original URL": link,
            "Votação": getFirst(table, ["Votação"], link),
            "Meio Processual": getFirst(table, ["Meio Processual"], link),
            "Secção": getFirst(table, ["Tribunal", "Secção", "Nº Convencional"], link), // STA tem tribunal (secção) e Nº convecional 
            "Espécie": getFirst(table, ["Espécie"], link),
            "Decisão": getDecisao(table),
            "Aditamento": getFirst(table, ["Aditamento"], link),
            "Jurisprudência": "unknown",
            "Origem": "csm-indexer"
        }

        // Add extra keys
        for( let key in table ){
            if( IGNORE_KEYS.indexOf(key) > -1 ){
                continue;
            }
            else if( key.startsWith("Data") ){
                body[key] = table[key].textContent.trim().replace(/-/g, '/');
            }
            else if( !(key in body) && !key.match(/Acórdãos \w+/) ){
                body[key] = table[key].textContent.trim();
            }
        }

        await index(body);
    }
    catch(e){
        console.log(e);
    }
})).catch(e => console.log(e));


async function forEachCSMRecord(fn){
    let offset = 0;
    let perPage = 500;
    let url = getUrl(offset, perPage);
    while(true){
        let { records, queryRecordCount } = await fetch.json(url).catch(e => ({records: [], queryRecordCount: 0}));
        console.log(offset,"/", queryRecordCount);
        for(let r of records){
            await fn(r);
        }
        offset += records.length;
        if(offset >= queryRecordCount) break;
        url = getUrl(offset, perPage);
        if( records.length == 0 ) {
            console.log("Sleeping...");
            await new Promise(resolve => setTimeout(resolve, 30*60*1000)); // 30 minutes
        };
    }
}

console.log("Starting...");

function getDescritores(table){
    if( table.Descritores ){
        // TODO: handle , and ; in descritores (e.g. "Ação Civil; Ação Civil e Administrativa") however dont split some cases (e.g. "Art 321º, do código civil")
        return table.Descritores.textContent.trim().split(/\n|;/).map( desc => desc.trim().replace(/\.$/g,'').replace(/^(:|-|,|"|“|”|«|»|‘|’)/,'').trim() ).filter( desc => desc.length > 0 )
    }
    return []
}

function strip_empty_html_and_remove_font_tag(html){
    return strip_empty_html(html).replace(/<\/?font>/g, '')
}

function getTexto(table){
    if( "Decisão Texto Integral" in table ){
        return strip_empty_html_and_remove_font_tag(table["Decisão Texto Integral"].innerHTML)
    }
    if( "Texto Integral" in table ){
        return strip_empty_html_and_remove_font_tag(table["Texto Integral"].innerHTML)
    }
    return null;
}

function getSumario(table){
    if( "Sumário" in table ){
        return strip_empty_html_and_remove_font_tag(table["Sumário"].innerHTML)
    }
    return null;
}

function getDecisao(table){
    if( "Decisão" in table ){
        return strip_empty_html_and_remove_font_tag(table["Decisão"].innerHTML)
    }
    return null;
}

function getData(table){
    if( "Data do Acordão" in table ){
        return table["Data do Acordão"].textContent.trim();
    }
    if( "Data da Decisão Sumária" in table ){
        return table["Data da Decisão Sumária"].textContent.trim();
    }
    if( "Data da Reclamação" in table ){
        return table["Data da Reclamação"].textContent.trim();
    }
    return null;
}

function getFirst(table, keys, link){
    for( let key of keys ){
        if( key in table ){
            return table[key].textContent.trim();
        }
    }
    return null;
}