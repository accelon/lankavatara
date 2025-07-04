/* 將 ABHIDHARMAKOŚA interliner .docx 存成 raw/kosa.txt */
/* 切分成 sankrit.txt , xuanzhang.txt , paramartha.txt 三個文件 */
import { toBase26 } from '../ptk/nodebundle.cjs';
import {nodefs,readTextContent,writeChanged} from './src/nodebundle.cjs'
await nodefs
const outdir='lankavatara/';
const lines=readTextContent('raw/interliner.off').replace(/\$/g,'').split('\n')

const sikhananda=[], bodhiruci=[], gunabhadra=[], sanskrit=[], huang=[],footnote={};
let out=sanskrit;
let blockid='0',chunkid='',pdfid='1';
let pagenotecount=0,notecount=0 , thispagenotecount=0;
const segment=[];
const emit=()=>{ //輸出一行到目標文件
    let s=segment.join('$$').trim();
    while (out.prevblockid==blockid) {
        if (!out.sameblockcount) out.sameblockcount=0;

        blockid=((out.prevblockid||'').replace(/[a-z]+$/,''))+toBase26(out.sameblockcount)
        out.sameblockcount++
        // console.log('autoblockid',blockid)
    }
    if (!blockid) blockid='0'
    //add ^ at the end to skip block id
    if (out!==footnote && s && !s.endsWith('^')) s+=' ^n'+chunkid+'-'+(blockid)+'\n';
    out.prevblockid=blockid;
    if (s.endsWith('^')) s=s.slice(0,s.length-1)
    if (s.startsWith('#')||s.startsWith('=')) s=s+'\n';
    if (out!==footnote) out.push(s)
    segment.length=0;
}
const epilog=outarr=>{
    outarr=fixblockid(outarr);
    return appendfootnote(outarr)
}
const appendfootnote=outarr=>{
    let s=outarr.join('\n');
    const out=[];
    s.replace(/\[\^(\d+)\]/g,(m,id)=>{
        out.push('[^'+id+']: '+(footnote[id]||" not found!!"))
        return '[^'+id+']';
    })
    
    return s+'\n'+(out.join('\n').replace(/\n+/g,'\n'));
}

const fixblockid=outarr=>{ // 1a => 2, 1b=>2a , 1=>1b
    const blockids={};
    let current='';//current block id with multiple segment
    let segmentcount=0;
    for (let i=0;i<outarr.length;i++) {
        const m=outarr[i].match(/\^n(\d+)-([a-z\d]+)/);
        if (!m) continue;
        const [m0,cid,bid]=m;
        const m2=bid.match(/[a-z]+$/)
        let newid='';
        if (m2) {
            current=(parseInt(bid)+1);
            newid=current+toBase26(segmentcount)
            segmentcount++;
            
        } else {
            if (current) {
                newid=current+toBase26(segmentcount)
                segmentcount++;
            }
            segmentcount=0;
            current=''
        }
        if (newid) {
            outarr[i]=outarr[i].replace('^n'+cid+'-'+bid,'^n'+cid+'-'+newid)
        }
    }   
    return outarr;
}
const splitter=()=>{
    for (let i=0;i<lines.length;i++){
        lines[i]=lines[i].replace(/(.)[①②③④]/g,(m,m1)=>{return m1+'[^'+(notecount+pagenotecount++)+']' });
        if (lines[i].startsWith('【梵】')) {
            emit();
            //blockid++;
            out=sanskrit;
            lines[i]=lines[i].replace(/\^n(\d+)/,(m,m1)=>{blockid=m1;out.sameblockcount=0;return ''});
            lines[i]=lines[i].replace(/\^ck(\d+)/,(m,m1)=>{chunkid=m1;blockid='0';return ''});
        } else if (lines[i].startsWith('【求】')) {
            emit();
            out=gunabhadra;
        } else if (lines[i].startsWith('【實】')) {
            emit();
            out=sikhananda;
        } else if (lines[i].startsWith('【菩】')){
            emit();
            out=bodhiruci;
        } else if (lines[i].startsWith('【黃】')){
            emit();
            out=huang;
        } else if (lines[i].startsWith('【注】')){
            emit();
            out=footnote            
        } else {
            const m=lines[i].match(/^[①②③④]/);
            if (!m) {
                console.log('unknown line type',lines[i])
            } else {
                let noteid=''
                const t=lines[i].replace(/^[①②③④]/,()=>{
                    noteid=notecount+thispagenotecount++;
                    return '' 
                });
                footnote[noteid]=t.replace(/\^pdf\d+/g,'');
            }
        }
        lines[i]=lines[i].replace(/\^pdf(\d+) ?/,(m,m1)=>{
            pdfid=m1;
            if (thispagenotecount!=pagenotecount) {
                console.warn('page note count missmatch pdf',pdfid,'footnote area',thispagenotecount,'text area',pagenotecount);
            }
            notecount+=thispagenotecount;
            thispagenotecount=0;
            pagenotecount=0;
            return ''
        });        

        if (out!==footnote) segment.push(lines[i].replace(/^【[求菩實梵黃]】/,'').replace(/\n/g,'$$'));

    }
    emit();


    

    writeChanged(outdir+'sanskrit.md',epilog(sanskrit),true)
    writeChanged(outdir+'gunabhadra.md',epilog(gunabhadra),true)
    writeChanged(outdir+'bodhiruci.md',epilog(bodhiruci),true)
    writeChanged(outdir+'sikhananda.md',epilog(sikhananda),true)
    writeChanged(outdir+'huang.md',epilog(huang),true)
    
    console.log('all note count',notecount)
}

splitter();