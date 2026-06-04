# Admin Dashboard - AI Knowledge Store

Admin Dashboard for managing digital products, categories, coupons, and analytics for the AI Knowledge Store platform.

## Features

- **Product Management**: Create, update, and delete digital products with file uploads
- **Category Management**: Organize products into categories
- **Coupon Management**: Create and manage discount coupons
- **Analytics Dashboard**: View sales statistics, revenue, and download metrics
- **Realtime Updates**: Automatic synchronization with Supabase
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Supabase** - Backend (Database, Auth, Storage, Realtime)

## Prerequisites

- Node.js 18+ and npm
- Supabase project with configured database and storage
- Environment variables configured in `.env.admin`

## Installation

1. Install dependencies:
```bash
cd admin
npm install
```

2. Verify environment variables in `.env.admin`:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_APP_URL=http://localhost:5174
```

## Development

Start the development server:
```bash
npm run dev
```

The admin dashboard will be available at `http://localhost:5174`

## Build

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## Project Structure

```
admin/
├── src/
│   ├── components/
│   │   └── layout/
│   │       ├── AdminNav.tsx      # Top navigation bar
│   │       └── Sidebar.tsx       # Sidebar navigation
│   ├── pages/
│   │   ├── Dashboard.tsx         # Main dashboard
│   │   ├── Products.tsx          # Product management
│   │   ├── Categories.tsx        # Category management
│   │   ├── Coupons.tsx          # Coupon management
│   │   └── Analytics.tsx         # Analytics and reports
│   ├── lib/
│   │   ├── supabase-admin.ts    # Supabase client configuration
│   │   └── storage.ts           # Storage utilities
│   ├── types/
│   │   └── admin.ts             # TypeScript interfaces
│   ├── App.tsx                  # Main app component
│   ├── main.tsx                 # Entry point
│   └── index.css                # Global styles
├── .env.admin                   # Environment variables
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key (for RLS operations) |
| `VITE_APP_URL` | Admin dashboard URL |

## Storage Buckets

The admin dashboard uses the following Supabase Storage buckets:

- `product-covers` - Product cover images (public, 5MB limit)
- `product-previews` - Product preview content (public, 10MB limit)
- `product-videos` - Promotional videos (public, 100MB limit)
- `ebooks-private` - Digital products (private, 500MB limit)

## Security

- Uses Supabase Row Level Security (RLS) for data access control
- All data operations are performed via an authenticated client with Row Level Security (RLS)
- Never expose service role key in client-side code
- All file uploads are validated for type and size

## Next Steps

This is the initial setup for Task 4. Future tasks will add:

- Product creation and editing forms (Task 5)
- File upload components with drag-and-drop (Task 5)
- Category CRUD operations (Task 6)
- Coupon management features (Task 7)
- Analytics charts and reports (Task 8)
- Realtime synchronization (Task 9)

## Requirements Coverage

This implementation covers the following requirements:

- **Requirement 1.1**: Product management interface
- **Requirement 1.8**: Product metadata handling
- **Requirement 10.8, 10.9**: Secure Supabase client configuration
- **Requirement 18.1, 18.2**: Responsive layout

## License

Private - AI Knowledge Store Platform
