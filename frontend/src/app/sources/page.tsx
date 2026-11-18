import type {Metadata} from "next";
import {DocumentLibraryScreen} from "@/components/document-library/DocumentLibraryScreen";
import "@/components/document-library/document-library.css";
export const metadata:Metadata={
 title:"مكتبة المستندات واللوائح | بيان",
 description:"مكتبة توضيحية للمستندات واللوائح وحالات الفهرسة ومعلومات الصفحات؛ بيانات وهمية لا تتصل بالتخزين أو Qdrant.",
 robots:{index:false,follow:false}
};
export default function SourcesPage(){return <DocumentLibraryScreen/>;}
