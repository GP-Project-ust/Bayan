import type {Metadata} from "next";
import {DocumentUploadScreen} from "@/components/document-upload/DocumentUploadScreen";
import "@/components/document-upload/document-upload.css";

export const metadata:Metadata={
  title:"رفع وفهرسة مستندات — عرض تجريبي | بيان",
  description:"واجهة تجريبية لمعاينة اختيار الملفات وتصنيفها ومراحل المعالجة؛ لا تُرسل البيانات ولا تُفهرس مستندات فعليًا.",
  robots:{index:false,follow:false}
};
export default function UploadDocumentsPage(){return <DocumentUploadScreen/>;}
