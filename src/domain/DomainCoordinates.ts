import { ScrollDirection, Position } from '../constant';

import type CalHeatmap from '../CalHeatmap';
import type DomainPainter from './DomainPainter';
import type DomainCollection from '../calendar/DomainCollection';
import type { SubDomain } from '../index';

type SubDomainWithCoordinates = Required<SubDomain> & {
  pre_x: number;
  pre_y: number;
  width: number;
  height: number;
  inner_width: number;
  inner_height: number;
};

export default class DomainCoordinates {
  calendar: CalHeatmap;

  domainPainter: DomainPainter;

  collection: Map<number, SubDomainWithCoordinates>;

  scrollDirection: ScrollDirection;

  constructor(calendar: CalHeatmap, domainPainter: DomainPainter) {
    this.calendar = calendar;
    this.domainPainter = domainPainter;
    this.collection = new Map();
    this.scrollDirection = ScrollDirection.SCROLL_FORWARD;
  }

  get(domainKey: number): SubDomainWithCoordinates | undefined {
    return this.collection.get(domainKey);
  }

  update(collection: DomainCollection, scrollDirection: ScrollDirection) {
    const { verticalOrientation, domain } = this.calendar.options.options;

    this.scrollDirection = scrollDirection;
    const dimensions = {
      width: 0,
      height: 0,
    };
    let exitingTotal = 0;
    let scrollFactor =
      scrollDirection === ScrollDirection.SCROLL_FORWARD ? -1 : 1;
    const { keys } = collection;
    if (this.calendar.options.options.domain.sort === 'desc') {
      keys.reverse();
      scrollFactor *= -1;
    }

    collection.yankedDomains.forEach((domainKey: number) => {
      exitingTotal +=
        this.collection.get(domainKey)![
          verticalOrientation ? 'height' : 'width'
        ];
    });
    collection.yankedDomains.forEach((domainKey: number) => {
      const coor = this.collection.get(domainKey)!;
      this.collection.set(domainKey, {
        ...coor,
        x: verticalOrientation ? coor.x : coor.x + exitingTotal * scrollFactor,
        y: verticalOrientation ? coor.y + exitingTotal * scrollFactor : coor.y,
      });
    });

    keys.forEach((domainKey: number) => {
      const w = this.#getWidth(domainKey);
      const h = this.#getHeight(domainKey);
      if (verticalOrientation) {
        dimensions.height += h;
        dimensions.width = Math.max(w, dimensions.width);
      } else {
        dimensions.width += w;
        dimensions.height = Math.max(h, dimensions.height);
      }

      const x = dimensions.width - w;
      const y = dimensions.height - h;

      this.collection.set(domainKey, {
        ...this.collection.get(domainKey)!,
        x: verticalOrientation ? 0 : x,
        y: verticalOrientation ? y : 0,
        pre_x: verticalOrientation ? x : x - exitingTotal * scrollFactor,
        pre_y: verticalOrientation ? y - exitingTotal * scrollFactor : y,
        width: w,
        height: h,
        inner_width: w - (verticalOrientation ? 0 : domain.gutter),
        inner_height: h - (!verticalOrientation ? 0 : domain.gutter),
      });
    });

    return dimensions;
  }

  /**
   * Return the full width of the domain block
   * @param {number} d Domain start timestamp
   * @return {number} The full width of the domain,
   * including all padding and gutter
   * Used to compute the x position of the domains on the x axis
   */
  #getWidth(d: number): number {
    const {
      domain, subDomain, x, verticalOrientation,
    } =
      this.calendar.options.options;
    const columnsCount = this.calendar.templateCollection
      .get(subDomain.type)!
      .columnsCount(d);

    const subDomainWidth =
      (subDomain.width + subDomain.gutter) * columnsCount - subDomain.gutter;

    return (
      domain.padding[Position.LEFT] +
      x.domainHorizontalLabelWidth +
      (verticalOrientation ? 0 : domain.gutter) +
      subDomainWidth +
      domain.padding[Position.RIGHT]
    );
  }

  /**
   * Return the full height of the domain block
   * @param {number} d Domain start timestamp
   * @return {number} The full height of the domain,
   * including all paddings and gutter.
   * Used to compute the y position of the domains on the y axis
   */
  #getHeight(d: number): number {
    const {
      domain, subDomain, x, verticalOrientation,
    } =
      this.calendar.options.options;
    const rowsCount = this.calendar.templateCollection
      .get(subDomain.type)!
      .rowsCount(d);

    const subDomainHeight =
      (subDomain.height + subDomain.gutter) * rowsCount - subDomain.gutter;

    return (
      domain.padding[Position.TOP] +
      subDomainHeight +
      (verticalOrientation ? domain.gutter : 0) +
      x.domainVerticalLabelHeight +
      domain.padding[Position.BOTTOM]
    );
  }
}
