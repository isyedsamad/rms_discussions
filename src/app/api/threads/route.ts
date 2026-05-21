import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "priority";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const status = searchParams.get("status") || "active";
    const priority = searchParams.get("priority") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "0", 10);

    const snapshot = await db.collection("threads")
      .where("status", "==", status)
      .get();

    let threads = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    if (priority && priority !== "all") {
      threads = threads.filter((t: any) => {
        const p = Number(t.priority || 0);
        let label = "low";
        if (p >= 8) label = "high";
        else if (p >= 4) label = "medium";
        return label === priority.toLowerCase();
      });
    }

    if (search) {
      const lowercaseSearch = search.toLowerCase();
      threads = threads.filter((t: any) =>
        t.title?.toLowerCase().includes(lowercaseSearch) ||
        t.description?.toLowerCase().includes(lowercaseSearch)
      );
    }

    threads.sort((a: any, b: any) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (sortBy === "createdAt") {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    const totalCount = threads.length;
    if (limit > 0) {
      const startIndex = (page - 1) * limit;
      threads = threads.slice(startIndex, startIndex + limit);
    }

    return NextResponse.json({ threads, totalCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, discussion, priority, email, uid, taggedFaculty } = body;

    if (!title || !priority) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let normalizedTaggedFaculty: string[] = [];
    if (Array.isArray(taggedFaculty)) {
      normalizedTaggedFaculty = taggedFaculty.filter(f => typeof f === "string" && f.trim() !== "");
    } else if (typeof taggedFaculty === "string" && taggedFaculty.trim() !== "") {
      normalizedTaggedFaculty = [taggedFaculty.trim()];
    }

    const docRef = await db.collection("threads").add({
      title,
      description: description || "",
      discussion: discussion !== false,
      priority: Number(priority),
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: {
        uid: uid || "anonymous",
        email: email || "anonymous"
      },
      taggedFaculty: normalizedTaggedFaculty,
      chats: []
    });

    return NextResponse.json({ id: docRef.id });
  } catch (error: any) {
    console.error("Error posting thread:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
