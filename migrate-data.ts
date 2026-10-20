import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";

const sqlite = new Database("./db/custom.db");
const pg = new PrismaClient();

async function migrate() {
  // Helper to read all rows from a SQLite table
  function readAll(table: string): any[] {
    try {
      return sqlite.prepare(`SELECT * FROM ${table}`).all();
    } catch {
      console.log(`  ⚠ Table ${table} not found or empty`);
      return [];
    }
  }

  // Clear PostgreSQL tables in correct order (reverse of dependencies)
  console.log("🗑 Clearing PostgreSQL tables...");
  await pg.scanLog.deleteMany();
  await pg.serviceHistory.deleteMany();
  await pg.workLog.deleteMany();
  await pg.invoiceItem.deleteMany();
  await pg.invoice.deleteMany();
  await pg.billRun.deleteMany();
  await pg.expense.deleteMany();
  await pg.income.deleteMany();
  await pg.serialNumber.deleteMany();
  await pg.stockMovement.deleteMany();
  await pg.dispatch.deleteMany();
  await pg.assembly.deleteMany();
  await pg.purchaseOrder.deleteMany();
  await pg.vendor.deleteMany();
  await pg.vendorCategory.deleteMany();
  await pg.product.deleteMany();
  await pg.component.deleteMany();
  await pg.category.deleteMany();
  await pg.warehouse.deleteMany();
  await pg.payroll.deleteMany();
  await pg.shiftLog.deleteMany();
  await pg.shift.deleteMany();
  await pg.attendance.deleteMany();
  await pg.employee.deleteMany();
  await pg.department.deleteMany();
  await pg.expenseCategory.deleteMany();
  await pg.client.deleteMany();
  await pg.setting.deleteMany();
  await pg.user.deleteMany();
  await pg.role.deleteMany();

  // Migrate each table
  const tables: { name: string; model: string }[] = [
    { name: "Role", model: "role" },
    { name: "User", model: "user" },
    { name: "Setting", model: "setting" },
    { name: "Department", model: "department" },
    { name: "Category", model: "category" },
    { name: "VendorCategory", model: "vendorCategory" },
    { name: "ExpenseCategory", model: "expenseCategory" },
    { name: "Employee", model: "employee" },
    { name: "Shift", model: "shift" },
    { name: "Warehouse", model: "warehouse" },
    { name: "Client", model: "client" },
    { name: "Vendor", model: "vendor" },
    { name: "Component", model: "component" },
    { name: "Product", model: "product" },
    { name: "Attendance", model: "attendance" },
    { name: "ShiftLog", model: "shiftLog" },
    { name: "Payroll", model: "payroll" },
    { name: "PurchaseOrder", model: "purchaseOrder" },
    { name: "Assembly", model: "assembly" },
    { name: "Dispatch", model: "dispatch" },
    { name: "StockMovement", model: "stockMovement" },
    { name: "SerialNumber", model: "serialNumber" },
    { name: "Income", model: "income" },
    { name: "Expense", model: "expense" },
    { name: "Invoice", model: "invoice" },
    { name: "InvoiceItem", model: "invoiceItem" },
    { name: "BillRun", model: "billRun" },
    { name: "WorkLog", model: "workLog" },
    { name: "ServiceHistory", model: "serviceHistory" },
    { name: "ScanLog", model: "scanLog" },
  ];

  for (const { name, model } of tables) {
    const rows = readAll(name);
    if (rows.length === 0) continue;

    console.log(`📦 Migrating ${name}: ${rows.length} rows...`);

    // Process in batches of 50
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50);
      const cleanBatch = batch.map((row: any) => {
        const clean: any = {};
        for (const [key, value] of Object.entries(row)) {
          // Convert SQLite integers for booleans
          if (key === "isOvernight" || key === "twoFactor") {
            clean[key] = value === 1 || value === true;
          }
          // Convert date strings/numbers to Date objects for DateTime fields
          else if (
            ["date", "due", "expected", "issued", "joinDate", "lastLogin",
             "createdAt", "updatedAt", "paymentDate", "time"].includes(key) &&
            value !== null && value !== undefined
          ) {
            const d = new Date(value as any);
            clean[key] = isNaN(d.getTime()) ? null : d;
          } else {
            clean[key] = value === undefined ? null : value;
          }
        }
        // Remove the 'time' field from ShiftLog (it was in old schema but not new)
        if (name === "ShiftLog" && "time" in clean) delete clean.time;
        if (name === "ShiftLog" && "shift" in clean) delete clean.shift;
        if (name === "ShiftLog" && "supervisor" in clean) delete clean.supervisor;
        return clean;
      });

      try {
        await (pg as any)[model].createMany({
          data: cleanBatch,
          skipDuplicates: true,
        });
      } catch (e: any) {
        // Try one by one if batch fails
        for (const row of cleanBatch) {
          try {
            await (pg as any)[model].create({ data: row });
          } catch (e2: any) {
            console.log(`  ⚠ Skipped ${name} row: ${e2.message?.slice(0, 80)}`);
          }
        }
      }
    }
  }

  console.log("✅ Migration complete!");
}

migrate()
  .catch((e) => { console.error("Migration failed:", e.message); process.exit(1); })
  .finally(async () => { sqlite.close(); await pg.$disconnect(); });
