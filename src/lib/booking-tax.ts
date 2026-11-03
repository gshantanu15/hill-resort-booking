const MAX_MONEY = 2_147_483_647;

export function splitInclusiveNight(unitPricePaise: number, quantity = 1) {
  if (
    !Number.isSafeInteger(unitPricePaise) ||
    unitPricePaise <= 0 ||
    unitPricePaise > MAX_MONEY ||
    !Number.isSafeInteger(quantity) ||
    quantity < 1
  ) {
    throw new Error(
      "Price and quantity must be positive whole values within the supported range.",
    );
  }
  const gross = BigInt(unitPricePaise);
  const threshold = 750000n;
  let taxRateBps: number;
  if (gross * 10000n <= threshold * 10500n) taxRateBps = 500;
  else if (gross * 10000n > threshold * 11800n) taxRateBps = 1800;
  else
    throw new Error(
      "This inclusive price falls between GST bands; use at most ₹7,875 or more than ₹8,850 per unit/night.",
    );
  const denominator = BigInt(10000 + taxRateBps);
  const unitNet = (gross * 10000n + denominator / 2n) / denominator;
  const count = BigInt(quantity);
  const total = gross * count;
  if (total > BigInt(MAX_MONEY))
    throw new Error("The nightly group amount exceeds the supported range.");
  const subtotal = unitNet * count;
  return {
    unitPricePaise,
    subtotalPaise: Number(subtotal),
    taxPaise: Number(total - subtotal),
    totalPaise: Number(total),
    taxRateBps,
    rateIncludesTax: true as const,
  };
}
