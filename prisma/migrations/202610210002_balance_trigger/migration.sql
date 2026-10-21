CREATE OR REPLACE FUNCTION check_journal_balance() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target text; deb numeric; cred numeric; bdeb numeric; bcred numeric; n bigint;
BEGIN
 target := COALESCE(to_jsonb(NEW)->>'journalId',to_jsonb(NEW)->>'id');
 SELECT count(*), COALESCE(sum("debit"),0),COALESCE(sum("credit"),0),COALESCE(sum("baseDebit"),0),COALESCE(sum("baseCredit"),0) INTO n,deb,cred,bdeb,bcred FROM "LedgerEntry" WHERE "journalId"=target;
 IF n < 2 OR deb <> cred OR bdeb <> bcred THEN RAISE EXCEPTION 'Unbalanced journal'; END IF;
 RETURN NEW;
END; $$;
