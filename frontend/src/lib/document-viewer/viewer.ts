/**
 * Screen 11 — document-viewer model. Every document and page in this bundle
 * is fictional. No file blobs, PDF bytes, tenant identifiers or RAG responses
 * are available. Keep the viewer honest: missing pages never get fake text.
 */
import {initialLibraryDocuments,makeDemoDocumentCitation,type LibraryDocument} from "@/lib/document-library/library";
import type {Snippet} from "@/lib/semantic-search/search";

export type ViewerQuery={doc?:string|string[];page?:string|string[];snippet?:string|string[]};
export type ViewerLocation={document:LibraryDocument|null;page:number;snippet:Snippet|null};
const first=(value:string|string[]|undefined)=>Array.isArray(value)?value[0]:value;

export function getDemoDocument(id:string|null|undefined):LibraryDocument|null {
 if(!id || !/^doc-[a-z0-9-]{1,72}$/.test(id))return null;
 return initialLibraryDocuments.find(doc=>doc.id===id)??null;
}
export function parseDocumentPage(value:string|undefined,max:number):number|null {
 if(!value||!/^\d{1,4}$/.test(value))return null;
 const parsed=Number(value);
 return Number.isSafeInteger(parsed)&&parsed>=1&&parsed<=max?parsed:null;
}
export function resolveViewerLocation(query:ViewerQuery):ViewerLocation{
 const docId=first(query.doc)??"doc-academic";
 const document=getDemoDocument(docId);
 if(!document)return {document:null,page:1,snippet:null};
 const requestedSnippet=first(query.snippet);
 const matchingSnippet=document.snippets.find(s=>s.id===requestedSnippet)??null;
 const requestedPage=parseDocumentPage(first(query.page),document.totalPages);
 const page=requestedPage??matchingSnippet?.page??document.snippets[0]?.page??1;
 return {document,page,snippet:matchingSnippet?.page===page?matchingSnippet:null};
}
export function viewerHref(documentId:string,page?:number,snippetId?:string):string{
 const query=new URLSearchParams({doc:documentId});
 if(page!==undefined&&Number.isInteger(page)&&page>=1)query.set("page",String(page));
 if(snippetId)query.set("snippet",snippetId);
 return `/sources/document?${query.toString()}`;
}
export function snippetsOnPage(doc:LibraryDocument,page:number):readonly Snippet[]{
 return doc.snippets.filter(snippet=>snippet.page===page);
}
export function pagesWithSnippets(doc:LibraryDocument):number[]{
 return [...new Set(doc.snippets.map(s=>s.page))].sort((a,b)=>a-b);
}
export function getPageCitation(doc:LibraryDocument,page:number):string|null{
 if(!Number.isInteger(page)||page<1||page>doc.totalPages)return null;
 if(!snippetsOnPage(doc,page).length)return null;
 return makeDemoDocumentCitation(doc,page);
}
export function nextPage(current:number,delta:-1|1,total:number):number{
 return Math.max(1,Math.min(total,current+delta));
}
