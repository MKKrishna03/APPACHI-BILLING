import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getMonthPrefix } from "@/lib/quotationNumber";

export async function GET() {
  const { rows } = await pool.query(
    `select q.*,
            coalesce(json_agg(i.* order by i.created_at) filter (where i.id is not null), '[]') as items
     from quotations q
     left join quotation_items i on i.quotation_id = q.id
     group by q.id
     order by q.created_at desc`
  );
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { items, gst, total, less, netTotal } = body;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "At least one item is required" },
      { status: 400 }
    );
  }

  const prefix = getMonthPrefix();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: countRows } = await client.query(
      "select count(*) as count from quotations where quotation_number like $1",
      [`${prefix}/%`]
    );
    const nextSeq = Number(countRows[0].count) + 1;
    const quotationNumber = `${prefix}/${String(nextSeq).padStart(2, "0")}`;

    const { rows: qRows } = await client.query(
      `insert into quotations (quotation_number, gst, total, less, net_total, revision)
       values ($1,$2,$3,$4,$5,1)
       returning *`,
      [quotationNumber, gst, total, less, netTotal]
    );
    const quotation = qRows[0];

    for (const item of items) {
      await client.query(
        `insert into quotation_items
           (quotation_id, category, product_id, product_name, purity, weight,
            wastage_percent, wastage_weight, rate, mc, gst, amount)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          quotation.id,
          item.category,
          item.productId || null,
          item.productName,
          item.purity || null,
          item.weight,
          item.wastagePercent,
          item.wastageWeight,
          item.rate,
          item.mc,
          item.gst,
          item.amount,
        ]
      );
    }

    await client.query("COMMIT");

    const { rows: itemRows } = await client.query(
      "select * from quotation_items where quotation_id = $1 order by created_at",
      [quotation.id]
    );

    return NextResponse.json(
      { ...quotation, items: itemRows },
      { status: 201 }
    );
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
