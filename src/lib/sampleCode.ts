// 各言語の代表サンプルコード
// 「入力例」ボタン用。営業デモで「例えばこういう COBOL を貼ってみます」と言って動かす想定
// 各サンプルは判定が確実に通る程度（決定的トークンを含む）+ 行数を10〜30行に抑制

export interface CodeSample {
  id: string;
  language: string;
  label: string;     // UI のボタン表示用（短く）
  code: string;
}

export const SAMPLES: CodeSample[] = [
  {
    id: "cobol",
    language: "COBOL",
    label: "COBOL",
    code: `       IDENTIFICATION DIVISION.
       PROGRAM-ID. CUSTLIST.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT CUST-FILE ASSIGN TO "CUSTOMER.DAT"
               ORGANIZATION IS LINE SEQUENTIAL.
       DATA DIVISION.
       FILE SECTION.
       FD  CUST-FILE.
       01  CUST-RECORD.
           05  CUST-ID         PIC 9(5).
           05  CUST-NAME       PIC X(30).
           05  CUST-BALANCE    PIC S9(7)V99 COMP-3.
       WORKING-STORAGE SECTION.
       01  WS-EOF              PIC X VALUE "N".
       01  WS-TOTAL            PIC S9(9)V99 COMP-3 VALUE ZERO.
       PROCEDURE DIVISION.
       MAIN-PARA.
           OPEN INPUT CUST-FILE.
           PERFORM UNTIL WS-EOF = "Y"
               READ CUST-FILE
                   AT END MOVE "Y" TO WS-EOF
                   NOT AT END
                       ADD CUST-BALANCE TO WS-TOTAL
                       DISPLAY CUST-ID " " CUST-NAME " " CUST-BALANCE
               END-READ
           END-PERFORM.
           CLOSE CUST-FILE.
           DISPLAY "TOTAL: " WS-TOTAL.
           STOP RUN.
`,
  },
  {
    id: "fortran",
    language: "Fortran",
    label: "Fortran 77",
    code: `      PROGRAM HEAT
C     1次元熱伝導方程式の有限差分シミュレーション
      IMPLICIT NONE
      INTEGER NMAX, NSTEP
      PARAMETER (NMAX = 100, NSTEP = 1000)
      REAL*8 U(0:NMAX), UNEW(0:NMAX)
      REAL*8 DX, DT, ALPHA, R
      INTEGER I, K

      COMMON /CONST/ ALPHA
      ALPHA = 1.0D-4
      DX = 0.01D0
      DT = 0.1D0
      R = ALPHA * DT / (DX * DX)

C     初期条件
      DO 10 I = 0, NMAX
        U(I) = 0.0D0
   10 CONTINUE
      U(NMAX/2) = 100.0D0

C     時間発展
      DO 30 K = 1, NSTEP
        DO 20 I = 1, NMAX - 1
          UNEW(I) = U(I) + R * (U(I+1) - 2.0D0 * U(I) + U(I-1))
   20   CONTINUE
        DO 25 I = 1, NMAX - 1
          U(I) = UNEW(I)
   25   CONTINUE
   30 CONTINUE

      WRITE(*,*) 'Final temperature at center:', U(NMAX/2)
      STOP
      END
`,
  },
  {
    id: "vb6",
    language: "VB6",
    label: "VB6",
    code: `VERSION 5.00
Begin VB.Form frmCustomer
   Caption         =   "顧客マスタ"
   ClientHeight    =   3000
   ClientWidth     =   4500
   Begin VB.CommandButton cmdSave
      Caption     =   "保存"
   End
   Begin VB.TextBox txtName
      Text        =   ""
   End
End
Attribute VB_Name = "frmCustomer"
Option Explicit

Private cn As ADODB.Connection

Private Sub Form_Load()
    Set cn = New ADODB.Connection
    cn.Open "Provider=Microsoft.Jet.OLEDB.4.0;Data Source=C:\\db\\cust.mdb"
End Sub

Private Sub cmdSave_Click()
    Dim sql As String
    If Len(Trim(txtName.Text)) = 0 Then
        MsgBox "名前を入力してください", vbExclamation
        Exit Sub
    End If
    sql = "INSERT INTO Customers (Name, CreatedAt) VALUES ('" & _
          Replace(txtName.Text, "'", "''") & "', Now())"
    cn.Execute sql
    MsgBox "保存しました"
    txtName.Text = ""
End Sub

Private Sub Form_Unload(Cancel As Integer)
    If Not cn Is Nothing Then cn.Close
    Set cn = Nothing
End Sub
`,
  },
  {
    id: "mumps",
    language: "MUMPS",
    label: "MUMPS",
    code: `PATIENT ; Patient registration routine
 ;
ADD(DFN,NAME,DOB,SEX) ; Add or update a patient record
 N X
 I '$D(^DPT(DFN)) S ^DPT(DFN,0)=NAME_"^"_DOB_"^"_SEX Q "ADDED"
 S X=^DPT(DFN,0)
 S $P(X,"^",1)=NAME,$P(X,"^",2)=DOB,$P(X,"^",3)=SEX
 S ^DPT(DFN,0)=X
 Q "UPDATED"
 ;
LOOKUP(DFN) ; Return patient demographics
 N X,RESULT
 I '$D(^DPT(DFN)) Q "NOT FOUND"
 S X=^DPT(DFN,0)
 S RESULT="Name="_$P(X,"^",1)
 S RESULT=RESULT_", DOB="_$P(X,"^",2)
 S RESULT=RESULT_", Sex="_$P(X,"^",3)
 Q RESULT
 ;
DEMO ; Demo entry point
 D ADD^PATIENT(1001,"SMITH,JOHN",19800115,"M")
 D ADD^PATIENT(1002,"JONES,MARY",19751230,"F")
 W $$LOOKUP^PATIENT(1001),!
 W $$LOOKUP^PATIENT(1002),!
 Q
`,
  },
  {
    id: "pli",
    language: "PL/I",
    label: "PL/I",
    code: ` INVENTORY: PROCEDURE OPTIONS(MAIN);
   DCL 1 ITEM,
         2 CODE       CHAR(10),
         2 NAME       CHAR(40),
         2 QTY        FIXED BINARY(31),
         2 PRICE      FIXED DECIMAL(9,2);
   DCL TOTAL          FIXED DECIMAL(11,2) INIT(0);
   DCL ITEM_COUNT     FIXED BINARY(31) INIT(0);
   DCL INV_FILE       FILE INPUT RECORD ENV(FB RECSIZE(80));
   DCL EOF_FLAG       BIT(1) INIT('0'B);

   ON ENDFILE(INV_FILE) EOF_FLAG = '1'B;
   OPEN FILE(INV_FILE);

   DO WHILE(\\EOF_FLAG);
     READ FILE(INV_FILE) INTO(ITEM);
     IF \\EOF_FLAG THEN DO;
       TOTAL = TOTAL + ITEM.QTY * ITEM.PRICE;
       ITEM_COUNT = ITEM_COUNT + 1;
       PUT SKIP LIST(ITEM.CODE, ITEM.NAME, ITEM.QTY, ITEM.PRICE);
     END;
   END;

   CLOSE FILE(INV_FILE);
   PUT SKIP(2) LIST('TOTAL ITEMS:', ITEM_COUNT);
   PUT SKIP LIST('TOTAL VALUE:', TOTAL);
 END INVENTORY;
`,
  },
  {
    id: "rpg",
    language: "RPG",
    label: "RPG IV",
    code: `**FREE
// 顧客マスタ更新プログラム (RPG IV Free-form)
DCL-F CUSTMAST DISK USAGE(*UPDATE:*OUTPUT) KEYED;

DCL-DS CustRec EXTNAME('CUSTMAST') QUALIFIED INZ;
END-DS;

DCL-S TotalBalance PACKED(11:2) INZ(0);
DCL-S CountActive INT(10) INZ(0);

DCL-PROC ProcessActiveCustomers;
  DCL-PI *N END-PI;

  READ CUSTMAST CustRec;
  DOW NOT %EOF(CUSTMAST);
    IF CustRec.STATUS = 'A';
      TotalBalance += CustRec.BALANCE;
      CountActive += 1;
      // ログ書き込み
      EXSR LogCustomer;
    ENDIF;
    READ CUSTMAST CustRec;
  ENDDO;
END-PROC;

DCL-PROC LogCustomer;
  DCL-PI *N END-PI;
  // 標準出力に書き出し
  DSPLY ('CUST=' + %CHAR(CustRec.CUSTID) +
         ' BAL=' + %CHAR(CustRec.BALANCE));
END-PROC;

ProcessActiveCustomers();
DSPLY ('Total: ' + %CHAR(TotalBalance) + ' / Count: ' + %CHAR(CountActive));
*INLR = *ON;
`,
  },
  {
    id: "ada",
    language: "Ada",
    label: "Ada",
    code: `with Ada.Text_IO;             use Ada.Text_IO;
with Ada.Integer_Text_IO;     use Ada.Integer_Text_IO;

package body Inventory is

   type Status_Type is (Active, Discontinued, Backorder);

   subtype Quantity is Integer range 0 .. 99_999;

   type Item_Record is record
      Code     : String (1 .. 10);
      Name     : String (1 .. 40);
      Qty      : Quantity;
      Status   : Status_Type;
   end record;

   type Item_Array is array (Positive range <>) of Item_Record;

   procedure Print_Items (Items : Item_Array) is
      Total : Integer := 0;
   begin
      for I in Items'Range loop
         declare
            It : Item_Record renames Items (I);
         begin
            if It.Status = Active then
               Put (It.Code); Put (" "); Put (It.Name); Put (" ");
               Put (It.Qty);
               New_Line;
               Total := Total + It.Qty;
            end if;
         end;
      end loop;
      Put_Line ("Total active qty: " & Integer'Image (Total));
   end Print_Items;

end Inventory;
`,
  },
  {
    id: "java",
    language: "Java",
    label: "Java",
    code: `package com.example.inventory;

import java.util.*;
import java.util.stream.*;

public class Inventory {

    public enum Status { ACTIVE, DISCONTINUED, BACKORDER }

    public record Item(String code, String name, int qty, double price, Status status) {}

    private final List<Item> items = new ArrayList<>();

    public void add(Item item) {
        items.add(item);
    }

    public double totalActiveValue() {
        return items.stream()
            .filter(i -> i.status() == Status.ACTIVE)
            .mapToDouble(i -> i.qty() * i.price())
            .sum();
    }

    public Map<Status, Long> countByStatus() {
        return items.stream()
            .collect(Collectors.groupingBy(Item::status, Collectors.counting()));
    }

    public static void main(String[] args) {
        Inventory inv = new Inventory();
        inv.add(new Item("A001", "Widget",  100, 12.50, Status.ACTIVE));
        inv.add(new Item("A002", "Gadget",   50, 25.00, Status.DISCONTINUED));
        inv.add(new Item("A003", "Sprocket", 200, 5.75, Status.ACTIVE));

        System.out.printf("Total active value: %.2f%n", inv.totalActiveValue());
        inv.countByStatus().forEach((s, c) -> System.out.println(s + " : " + c));
    }
}
`,
  },
];

export function getSampleById(id: string): CodeSample | undefined {
  return SAMPLES.find((s) => s.id === id);
}
