import { marked } from "marked";

interface MarkdownProps {
  content: string;
  className?: string;
}

export function Markdown({ content, className }: MarkdownProps) {
  const html = marked.parse(content, { async: false }) as string;

  return (
    <div
      className={`prose prose-sm dark:prose-invert max-w-none ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
