import { useState } from 'react';
import { revealContact, getApiErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ContactRevealModal, { contactDataFromReveal, type ContactRevealData } from '../components/ContactRevealModal';
import PlansModal from '../components/PlansModal';
import { publicListingTitle } from '../utils/listingKind';
import type { Listing } from '../types';
import type { AuthModalOptions } from '../pages/ListingDetailPage';

/**
 * Unlock a listing's contact from a list page (1 lead): asks to sign in, opens the plans when the
 * user has no leads left, and shows the contact popup. Render `modals` once in the page.
 */
export function useContactUnlock(onOpenAuth?: (options?: AuthModalOptions) => void) {
  const { user, refreshUser } = useAuth();
  const [unlockingId, setUnlockingId] = useState<number | null>(null);
  const [active, setActive] = useState<{ listing: Listing; data: ContactRevealData } | null>(null);
  const [pending, setPending] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);

  const unlock = async (listing: Listing): Promise<void> => {
    setError(null);
    if (!user) {
      onOpenAuth?.({
        title: 'Sign In to View Contact Details',
        subtitle: 'Please sign in or create an account to connect directly with this business.',
        icon: 'fa-phone-alt',
        onSuccess: () => { void unlock(listing); }
      });
      return;
    }
    setUnlockingId(listing.id);
    try {
      const res = await revealContact(listing.id);
      if (res.data?.status === 'success') {
        setActive({ listing, data: contactDataFromReveal(res.data, listing, user.leads_balance) });
        await refreshUser();
      } else if (res.data?.code === 'no_leads') {
        setPending(listing);
      } else {
        setError(res.data?.message || 'Unable to unlock contact details.');
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Unable to unlock contact details.'));
    } finally {
      setUnlockingId(null);
    }
  };

  const modals = (
    <>
      <ContactRevealModal
        isOpen={active !== null}
        onClose={() => setActive(null)}
        contactData={active?.data ?? null}
        listingTitle={active ? publicListingTitle(active.listing) : undefined}
      />
      <PlansModal
        isOpen={pending !== null}
        noLeads
        onClose={() => setPending(null)}
        onSuccess={() => {
          const next = pending;
          setPending(null);
          if (next) void unlock(next);
        }}
      />
    </>
  );

  return { unlock, unlockingId, error, modals };
}
