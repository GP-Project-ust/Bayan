import type {Metadata} from "next";
import {ReportPreviewScreen} from "@/components/report-preview/ReportPreviewScreen";
import "@/components/report-preview/report-preview.css";
export const metadata:Metadata={title:"معاينة التقرير وتصديره | بيان",description:"عارض تقارير تجريبي مع تصدير CSV وExcel وطباعة A4 إلى PDF.",robots:{index:false,follow:false}};
export default async function ReportDetailPage({searchParams}:{searchParams:Promise<{report?:string|string[]}>}){
 const params=await searchParams;
 const value=typeof params.report==="string"?params.report:Array.isArray(params.report)?params.report[0]:"rep-101";
 return <ReportPreviewScreen reportId={value}/>;
}
