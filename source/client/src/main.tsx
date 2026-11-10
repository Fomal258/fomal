import { createRoot } from "react-dom/client";
import Home from "@/pages/Home";
import "./index.css";

// 사이트 시작점: index.html의 <div id="root"> 안에 홈 화면을 그립니다.
createRoot(document.getElementById("root")!).render(<Home />);
