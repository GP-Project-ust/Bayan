import type {Metadata} from "next";
import {DocumentViewerScreen} from "@/components/document-viewer/DocumentViewerScreen";
import {resolveViewerLocation,type ViewerQuery} from "@/lib/document-viewer/viewer";
import "@/components/document-viewer/document-viewer.css";

export const metadata:Metadata={
 title:"عارض المستند والمصادر | بيان",
 description:"معاينة تجريبية مستقلة لصفحات المستندات ومقاطع الاستشهاد؛ دون ملفات PDF فعلية أو اتصال بمنصة RAG.",
 robots:{index:false,follow:false},
};

export default async function DocumentPage({searchParams}:{searchParams:Promise<ViewerQuery>}){
 const location=resolveViewerLocation(await searchParams);
 return <DocumentViewerScreen documentId={location.document?.id??null} initialPage={location.page} initialSnippetId={location.snippet?.id??null}/>;
}
