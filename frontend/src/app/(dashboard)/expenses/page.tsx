import { Metadata } from "next";
import { APP_NAME } from "@data";
import { ExpenseList } from "./components";

export const metadata: Metadata = {
    title: `${APP_NAME} | Expenses`,
    description: "Expense ledger — track all operating costs by category",
};

export default function ExpensesPage() {
    return (
        <section className="flex w-full flex-col gap-6 pb-20 md:pb-2">
            <ExpenseList />
        </section>
    );
}
