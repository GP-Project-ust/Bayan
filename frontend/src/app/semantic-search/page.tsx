import type {Metadata} from "next";
import {SemanticSearchScreen} from "@/components/semantic-search/SemanticSearchScreen";
import "@/components/semantic-search/semantic-search.css";
export const metadata:Metadata={
  title:"البحث الدلالي في المستندات | بيان",
  description:"واجهة توضيحية للبحث في اللوائح والمستندات مع المقاطع والاستشهادات والصفحات؛ دون اتصال فعلي بخدمة RAG.",
  robots:{index:false,follow:false},
};
export default function SemanticSearchPage(){return <SemanticSearchScreen/>;}
