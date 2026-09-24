import { parse } from 'parse5';

const BLOCKS = new Set(['address', 'article', 'aside', 'blockquote', 'br', 'dd', 'div',
  'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3',
  'h4', 'h5', 'h6', 'header', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre', 'section',
  'table', 'td', 'th', 'tr', 'ul']);

/** Parse HTML as HTML: comments disappear, entities decode, inline text joins. */
export function inspectHtml(html) {
  const text = [];
  const attributes = [];
  const ids = new Set();
  const references = [];
  function visit(node) {
    if (node.nodeName === '#comment') return;
    if (node.nodeName === '#text') text.push(node.value);
    if (BLOCKS.has(node.tagName)) text.push('\n');
    for (const { name, value } of node.attrs ?? []) {
      attributes.push(value);
      if (name === 'id') ids.add(value);
      if (name === 'href' || name === 'src') references.push({ name, value });
    }
    for (const child of node.childNodes ?? []) visit(child);
    if (node.content) visit(node.content);
    if (BLOCKS.has(node.tagName)) text.push('\n');
  }
  visit(parse(html));
  // Retain metadata, accessible labels, URLs and structured-data text in the
  // claims gate; moving to a parser must not create an unchecked content lane.
  return { claims: [...text, '\n', attributes.join('\n')].join(''), ids, references };
}
