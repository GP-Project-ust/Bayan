import type {Metadata} from "next";
import {ReportBuilderScreen} from "@/components/report-builder/ReportBuilderScreen";
import "@/components/report-builder/report-builder.css";
export const metadata:Metadata={title:"إنشاء تقرير ذكي | بيان",description:"معالج إنشاء التقارير التفاعلي التجريبي في نظام بيان؛ لا ينشئ تقارير حقيقية.",robots:{index:false,follow:false}};
export default function NewReportPage(){return <ReportBuilderScreen/>;}
