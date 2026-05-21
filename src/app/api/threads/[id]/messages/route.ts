import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import admin from "firebase-admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { sender, senderId, message } = body;

    if (!message || !sender || !senderId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const messageObj = {
      id: Math.random().toString(36).substring(2) + Date.now().toString(36),
      sender,
      senderId,
      message,
      timestamp: new Date().toISOString()
    };

    await db.collection("threads").doc(id).update({
      chats: admin.firestore.FieldValue.arrayUnion(messageObj),
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json(messageObj);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { messageId, senderId } = body;

    if (!messageId || !senderId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const docRef = db.collection("threads").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const threadData = doc.data();
    const chats = threadData?.chats || [];
    const messageIndex = chats.findIndex((c: any) => c.id === messageId);

    if (messageIndex === -1) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (chats[messageIndex].senderId !== senderId) {
      return NextResponse.json({ error: "Unauthorized to delete this message" }, { status: 403 });
    }

    const updatedChats = chats.filter((c: any) => c.id !== messageId);

    await docRef.update({
      chats: updatedChats,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
