import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  const { rows } = await pool.query(
    "select * from scraps order by created_at desc"
  );
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
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

  if (!category || !scrapName) {
    return NextResponse.json(
      { error: "category and scrapName are required" },
      { status: 400 }
    );
  }

  const { rows } = await pool.query(
    `insert into scraps (category, scrap_name, scrap_weight, scrap_less, scrap_weight_after_less, rate, total)
     values ($1, $2, $3, $4, round($5::numeric, 3), $6, round($7::numeric, 2))
     returning *`,
    [category, scrapName, scrapWeight, scrapLess, scrapWeightAfterLess, rate, total]
  );

  return NextResponse.json(rows[0], { status: 201 });
}
