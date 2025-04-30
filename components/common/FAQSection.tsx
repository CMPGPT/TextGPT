"use client";

import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  title?: string;
  faqs: FAQItem[];
  variant?: "light" | "dark" | "iqr" | "kiwi";
  className?: string;
}

export default function FAQSection({
  title = "Frequently Asked Questions",
  faqs,
  variant = "light",
  className = "",
}: FAQSectionProps) {
  const getStyles = () => {
    switch (variant) {
      case "light":
        return {
          container: "bg-white py-16",
          title: "text-textgpt-200",
          highlight: "text-textgpt-300",
          accordion: "bg-gray-50 rounded-lg",
          trigger: "text-textgpt-200 hover:text-textgpt-300",
          content: "text-gray-600",
        };
      case "dark":
        return {
          container: "bg-textgpt-200 py-16",
          title: "text-white",
          highlight: "text-textgpt-300",
          accordion: "bg-textgpt-200/70 rounded-lg border-white/10",
          trigger: "text-white hover:text-textgpt-300",
          content: "text-white/80",
        };
      case "iqr":
        return {
          container: "bg-iqr-50 py-16",
          title: "text-white",
          highlight: "text-iqr-200",
          accordion: "bg-iqr-100/50 rounded-lg border-white/10",
          trigger: "text-white hover:text-iqr-200",
          content: "text-iqr-300",
        };
      case "kiwi":
        return {
          container: "bg-kiwi-50 py-16",
          title: "text-white",
          highlight: "text-kiwi-200",
          accordion: "bg-kiwi-50/70 rounded-lg border-white/10",
          trigger: "text-white hover:text-kiwi-200",
          content: "text-white/80",
        };
      default:
        return {
          container: "bg-white py-16",
          title: "text-textgpt-200",
          highlight: "text-textgpt-300",
          accordion: "bg-gray-50 rounded-lg",
          trigger: "text-textgpt-200 hover:text-textgpt-300",
          content: "text-gray-600",
        };
    }
  };

  const styles = getStyles();

  return (
    <section className={`${styles.container} ${className}`}>
      <div className="container mx-auto px-6 max-w-4xl">
        {title && (
          <h2 className={`text-3xl md:text-4xl font-bold text-center mb-10 ${styles.title}`}>
            <span>Frequently Asked </span>
            <span className={styles.highlight}>Questions</span>
          </h2>
        )}
        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className={`${styles.accordion} border border-opacity-10 overflow-hidden`}
            >
              <AccordionTrigger className={`px-6 ${styles.trigger} text-lg font-medium`}>
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className={`px-6 ${styles.content}`}>
                <div dangerouslySetInnerHTML={{ __html: faq.answer }} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
} 