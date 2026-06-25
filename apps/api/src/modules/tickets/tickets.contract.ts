export type TicketStatus = 'open' | 'in-review' | 'answered' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

export type TicketDto = {
  id: string
  accountId: string
  subject: string
  status: TicketStatus
  priority: TicketPriority
  createdAt: string
  updatedAt: string
}

export type TicketMessageDto = {
  id: string
  ticketId: string
  authorId: string
  body: string
  createdAt: string
}
