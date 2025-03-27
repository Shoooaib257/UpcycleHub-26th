import { useUser } from '@clerk/clerk-react';

const Dashboard = () => {
  const { user } = useUser();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">
        Welcome back, {user?.firstName || 'User'}!
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-6 bg-card rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Your Listed Items</h2>
          {/* Add your listed items component here */}
          <p className="text-muted-foreground">No items listed yet.</p>
        </div>

        <div className="p-6 bg-card rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          {/* Add your activity feed component here */}
          <p className="text-muted-foreground">No recent activity.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 