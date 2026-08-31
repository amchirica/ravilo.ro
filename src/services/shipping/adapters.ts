export type ShippingQuoteInput = {
  destinationPostalCode: string;
  weightGrams: number;
};

export interface ShippingAdapter {
  readonly provider: string;
  quote?(input: ShippingQuoteInput): Promise<number>;
}

export class ManualShippingAdapter implements ShippingAdapter {
  readonly provider = "manual";
}

export class SamedayAdapter implements ShippingAdapter {
  readonly provider = "sameday";
}

export class FanCourierAdapter implements ShippingAdapter {
  readonly provider = "fan_courier";
}

export class CargusAdapter implements ShippingAdapter {
  readonly provider = "cargus";
}

export class DpdAdapter implements ShippingAdapter {
  readonly provider = "dpd";
}

export function shippingAdapter(provider: string): ShippingAdapter {
  switch (provider) {
    case "sameday":
      return new SamedayAdapter();
    case "fan_courier":
      return new FanCourierAdapter();
    case "cargus":
      return new CargusAdapter();
    case "dpd":
      return new DpdAdapter();
    default:
      return new ManualShippingAdapter();
  }
}
