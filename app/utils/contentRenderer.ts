/**
 * Utility functions for converting between HTML and Markdown
 * and safely rendering content
 */

/**
 * Convert HTML to Markdown-like format for better rendering
 * This handles common HTML elements that TipTap might generate
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return '';
  
  let markdown = html;
  
  // Handle headings
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
  markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n');
  markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n');
  
  // Handle paragraphs
  markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
  
  // Handle line breaks
  markdown = markdown.replace(/<br\s*\/?>/gi, '\n');
  
  // Handle strong/bold
  markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  
  // Handle emphasis/italic
  markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
  
  // Handle code
  markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
  markdown = markdown.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gi, '```\n$1\n```\n\n');
  markdown = markdown.replace(/<pre[^>]*>(.*?)<\/pre>/gi, '```\n$1\n```\n\n');
  
  // Handle blockquotes
  markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, (match, content) => {
    const lines = content.trim().split('\n');
    return lines.map((line: string) => `> ${line.trim()}`).join('\n') + '\n\n';
  });
  
  // Handle unordered lists
  markdown = markdown.replace(/<ul[^>]*>(.*?)<\/ul>/gi, (match, content) => {
    let listContent = content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
    return listContent + '\n';
  });
  
  // Handle ordered lists
  markdown = markdown.replace(/<ol[^>]*>(.*?)<\/ol>/gi, (match, content) => {
    let counter = 1;
    let listContent = content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => {
      return `${counter++}. $1\n`;
    });
    return listContent + '\n';
  });
  
  // Handle task lists (checkboxes)
  markdown = markdown.replace(/<li[^>]*data-checked="true"[^>]*>(.*?)<\/li>/gi, '- [x] $1\n');
  markdown = markdown.replace(/<li[^>]*data-checked="false"[^>]*>(.*?)<\/li>/gi, '- [ ] $1\n');
  
  // Handle horizontal rules
  markdown = markdown.replace(/<hr\s*\/?>/gi, '\n---\n\n');
  
  // Handle links
  markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  
  // Handle images
  markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)');
  markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)');
  
  // Handle highlights/marks
  markdown = markdown.replace(/<mark[^>]*>(.*?)<\/mark>/gi, '==$1==');
  
  // Handle tables (basic support)
  markdown = markdown.replace(/<table[^>]*>(.*?)<\/table>/gi, (match, content) => {
    // This is a simplified table conversion - you might want to enhance this
    let tableContent = content;
    tableContent = tableContent.replace(/<thead[^>]*>(.*?)<\/thead>/gi, '$1');
    tableContent = tableContent.replace(/<tbody[^>]*>(.*?)<\/tbody>/gi, '$1');
    tableContent = tableContent.replace(/<tr[^>]*>(.*?)<\/tr>/gi, '$1|\n');
    tableContent = tableContent.replace(/<th[^>]*>(.*?)<\/th>/gi, '| $1 ');
    tableContent = tableContent.replace(/<td[^>]*>(.*?)<\/td>/gi, '| $1 ');
    return '\n' + tableContent + '\n';
  });
  
  // Clean up extra whitespace and newlines
  markdown = markdown.replace(/\n{3,}/g, '\n\n');
  markdown = markdown.trim();
  
  return markdown;
}

/**
 * Clean and prepare content for rendering
 */
export function prepareContent(content: string): string {
  if (!content) return '';
  
  // If content looks like HTML, convert it to markdown
  if (content.includes('<') && content.includes('>')) {
    return htmlToMarkdown(content);
  }
  
  // Otherwise, treat as markdown
  return content;
}
