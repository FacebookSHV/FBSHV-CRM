import { MessageCircle, ShoppingBag, UserRound } from "lucide-react";
import { PageHeader } from "@/components/pages/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import type { CrmCustomer } from "@/lib/crm/customers";

type CrmContentProps = {
  customers: CrmCustomer[];
  emptyMessage: string;
};

function formatDate(value?: string | null) {
  if (!value) return "Chưa có";
  return new Date(value).toLocaleString("vi-VN");
}

export function CrmContent({ customers, emptyMessage }: CrmContentProps) {
  return (
    <div>
      <PageHeader
        title="CRM khách hàng"
        subtitle="Khách thật được tạo từ inbox, comment và đơn hàng; không hiển thị dữ liệu demo."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white p-3 shadow-soft">
        <StatusPill tone="success">Dữ liệu thật</StatusPill>
        <span className="text-sm text-slate-600">{customers.length} khách hàng trong workspace hiện tại</span>
      </div>

      {customers.length === 0 ? (
        <EmptyState title="Chưa có khách hàng thật" description={emptyMessage} />
      ) : (
        <>
          <div className="grid gap-3 lg:hidden">
            {customers.map((customer) => (
              <CustomerCard key={customer.id} customer={customer} />
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-md border border-slate-200 bg-white shadow-soft lg:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Khách hàng</th>
                  <th className="px-4 py-3">Tương tác</th>
                  <th className="px-4 py-3">Đơn hàng</th>
                  <th className="px-4 py-3">Lần gần nhất</th>
                  <th className="px-4 py-3">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink">{customer.name}</div>
                      <div className="text-xs text-slate-500">{customer.phone || customer.facebookId || customer.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      {customer.conversationCount} inbox · {customer.commentCount} comment
                    </td>
                    <td className="px-4 py-3">{customer.orderCount}</td>
                    <td className="px-4 py-3">{formatDate(customer.lastInteractionAt)}</td>
                    <td className="px-4 py-3 text-slate-600">{customer.note || "Chưa có ghi chú"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function CustomerCard({ customer }: { customer: CrmCustomer }) {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700">
          <UserRound className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">{customer.name}</h2>
          <p className="mt-1 text-xs text-slate-500">{customer.phone || customer.facebookId || customer.id}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-md bg-slate-50 p-3">
          <MessageCircle className="h-4 w-4 text-brand-600" aria-hidden="true" />
          <div className="mt-2 font-semibold text-ink">{customer.conversationCount + customer.commentCount}</div>
          <div className="text-xs text-slate-500">tương tác</div>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <ShoppingBag className="h-4 w-4 text-brand-600" aria-hidden="true" />
          <div className="mt-2 font-semibold text-ink">{customer.orderCount}</div>
          <div className="text-xs text-slate-500">đơn hàng</div>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">Gần nhất: {formatDate(customer.lastInteractionAt)}</p>
    </article>
  );
}
