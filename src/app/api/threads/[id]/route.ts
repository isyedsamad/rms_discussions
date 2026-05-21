import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doc = await db.collection("threads").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    return NextResponse.json({ id: doc.id, ...doc.data() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, closedBy } = body;

    if (!status || (status !== "active" && status !== "inactive")) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const updateData: any = {
      status,
      updatedAt: new Date().toISOString()
    };

    if (status === "inactive") {
      updateData.closedBy = closedBy || { uid: "unknown", email: "unknown" };
    } else {
      updateData.closedBy = null;
    }

    await db.collection("threads").doc(id).update(updateData);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
