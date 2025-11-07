"use client";
import { useState } from "react";

type Question = {
  id: string;
  type: "single" | "multiple" | "likert" | "text";
  question_text: string;
  options?: string[];
  required?: boolean;
};
export default function SurveyFormBuilder() {
  const [questions, setQuestions] = useState<Question[]>([]);
  return (
    <div className="grid">
      <button className="btn">+ Añadir pregunta</button>
      <pre className="card" style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(questions, null, 2)}</pre>
    </div>
  );
}
