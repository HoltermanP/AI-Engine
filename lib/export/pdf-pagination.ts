/** A4 @ 96dpi */
export const PDF_PAGE_WIDTH_PX = 794;
export const PDF_PAGE_HEIGHT_PX = 1123;
export const PDF_PAGE_PADDING = { top: 48, right: 56, bottom: 48, left: 56 } as const;

const CONTENT_WIDTH_PX =
  PDF_PAGE_WIDTH_PX - PDF_PAGE_PADDING.left - PDF_PAGE_PADDING.right;
const CONTENT_HEIGHT_PX =
  PDF_PAGE_HEIGHT_PX - PDF_PAGE_PADDING.top - PDF_PAGE_PADDING.bottom;

type PaginateUnit =
  | { kind: 'element'; element: HTMLElement }
  | { kind: 'list'; element: HTMLUListElement | HTMLOListElement };

/** instanceof faalt voor nodes uit een iframe-document; gebruik tagName. */
function isElement(node: Node): node is Element {
  return node.nodeType === Node.ELEMENT_NODE;
}

function isListElement(el: Element): el is HTMLUListElement | HTMLOListElement {
  const tag = el.tagName;
  return tag === 'UL' || tag === 'OL';
}

function isListItem(el: Element): el is HTMLLIElement {
  return el.tagName === 'LI';
}

function createPage(doc: Document): HTMLDivElement {
  const page = doc.createElement('div');
  page.className = 'pdf-page';
  page.style.width = `${PDF_PAGE_WIDTH_PX}px`;
  page.style.height = `${PDF_PAGE_HEIGHT_PX}px`;
  page.style.padding = `${PDF_PAGE_PADDING.top}px ${PDF_PAGE_PADDING.right}px ${PDF_PAGE_PADDING.bottom}px ${PDF_PAGE_PADDING.left}px`;
  page.style.background = '#ffffff';
  page.style.boxSizing = 'border-box';
  page.style.overflow = 'hidden';

  const content = doc.createElement('div');
  content.className = 'pdf-page-content';
  page.appendChild(content);
  return page;
}

function measureContainer(doc: Document, container: HTMLElement): number {
  const probe = doc.createElement('div');
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.left = '-9999px';
  probe.style.top = '0';
  probe.style.width = `${CONTENT_WIDTH_PX}px`;
  probe.appendChild(container);
  doc.body.appendChild(probe);
  const height = probe.getBoundingClientRect().height;
  doc.body.removeChild(probe);
  return height;
}

function measureBlocks(doc: Document, blocks: HTMLElement[]): number {
  const container = doc.createElement('div');
  container.className = 'pdf-page-content';
  for (const block of blocks) {
    container.appendChild(block.cloneNode(true));
  }
  return measureContainer(doc, container);
}

function collectUnits(body: HTMLElement): PaginateUnit[] {
  const units: PaginateUnit[] = [];

  for (const child of Array.from(body.children)) {
    if (!isElement(child)) continue;

    if (child.classList.contains('doc-body')) {
      for (const block of Array.from(child.children)) {
        if (!isElement(block)) continue;
        if (isListElement(block)) {
          units.push({ kind: 'list', element: block as HTMLUListElement | HTMLOListElement });
        } else {
          units.push({ kind: 'element', element: block as HTMLElement });
        }
      }
      continue;
    }

    units.push({ kind: 'element', element: child as HTMLElement });
  }

  return units;
}

class PageBuilder {
  private pages: HTMLDivElement[] = [];
  private currentPage: HTMLDivElement;
  private currentContent: HTMLDivElement;
  private currentBlocks: HTMLElement[] = [];

  constructor(private doc: Document) {
    this.currentPage = createPage(doc);
    this.currentContent = this.currentPage.querySelector('.pdf-page-content')!;
  }

  private flushCurrentPage() {
    if (this.currentBlocks.length > 0) {
      this.pages.push(this.currentPage);
    }
    this.currentPage = createPage(this.doc);
    this.currentContent = this.currentPage.querySelector('.pdf-page-content')!;
    this.currentBlocks = [];
  }

  private syncDomFromBlocks() {
    this.currentContent.replaceChildren(...this.currentBlocks.map((block) => block.cloneNode(true)));
  }

  appendElement(element: HTMLElement) {
    const nextBlocks = [...this.currentBlocks, element];
    const nextHeight = measureBlocks(this.doc, nextBlocks);

    if (nextHeight > CONTENT_HEIGHT_PX && this.currentBlocks.length > 0) {
      this.flushCurrentPage();
      this.appendElement(element);
      return;
    }

    if (nextHeight > CONTENT_HEIGHT_PX) {
      this.currentBlocks = [element];
      this.syncDomFromBlocks();
      this.flushCurrentPage();
      return;
    }

    this.currentBlocks = nextBlocks;
    this.syncDomFromBlocks();
  }

  appendList(list: HTMLUListElement | HTMLOListElement) {
    const tag = list.tagName.toLowerCase();
    const items = Array.from(list.children).filter(isListItem);

    let currentList = this.doc.createElement(tag) as HTMLUListElement | HTMLOListElement;
    if (list.className) currentList.className = list.className;

    for (const item of items) {
      currentList.appendChild(item.cloneNode(true));
      const listHeight = measureBlocks(this.doc, [currentList]);

      if (listHeight > CONTENT_HEIGHT_PX && currentList.childElementCount > 1) {
        currentList.removeChild(currentList.lastChild!);
        this.appendElement(currentList);
        currentList = this.doc.createElement(tag) as HTMLUListElement | HTMLOListElement;
        if (list.className) currentList.className = list.className;
        currentList.appendChild(item.cloneNode(true));
        continue;
      }

      if (listHeight > CONTENT_HEIGHT_PX && currentList.childElementCount === 1) {
        this.appendElement(currentList);
        currentList = this.doc.createElement(tag) as HTMLUListElement | HTMLOListElement;
        if (list.className) currentList.className = list.className;
      }
    }

    if (currentList.childElementCount > 0) {
      this.appendElement(currentList);
    }
  }

  build(): HTMLDivElement[] {
    if (this.currentBlocks.length > 0) {
      this.pages.push(this.currentPage);
    }
    return this.pages;
  }
}

export function paginatePrintDocument(body: HTMLElement, doc: Document): HTMLDivElement[] {
  const builder = new PageBuilder(doc);

  for (const unit of collectUnits(body)) {
    if (unit.kind === 'list') {
      builder.appendList(unit.element);
    } else {
      builder.appendElement(unit.element);
    }
  }

  const pages = builder.build();
  if (pages.length > 0) return pages;

  // Fallback: één pagina met volledige body-inhoud
  const fallbackPage = createPage(doc);
  const fallbackContent = fallbackPage.querySelector('.pdf-page-content')!;
  for (const child of Array.from(body.children)) {
    if (isElement(child)) {
      fallbackContent.appendChild(child.cloneNode(true));
    }
  }
  if (fallbackContent.childElementCount > 0) {
    return [fallbackPage];
  }

  return pages;
}
