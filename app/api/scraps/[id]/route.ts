import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { rows } = await pool.query("select * from scraps where id = $1", [
    id,
  ]);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(rows[0]);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const {
    category,
    scrapName,
    scrapWeight,
    scrapLess,
    scrapWeightAfterLess,
    rate,
    total,
  } = body;

  const { rows } = await pool.query(
    `update scraps
     set category = $1, scrap_name = $2, scrap_weight = $3, scrap_less = $4,
         scrap_weight_after_less = round($5::numeric, 3), rate = $6, total = round($7::numeric, 2)
     where id = $8
     returning *`,
    [
      category,
      scrapName,
      scrapWeight,
      scrapLess,
      scrapWeightAfterLess,
      rate,
      total,
      id,
    ]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(rows[0]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await pool.query("delete from scraps where id = $1", [id]);
  return NextResponse.json({ ok: true });
}
