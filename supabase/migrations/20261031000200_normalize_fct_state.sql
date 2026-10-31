-- One spelling for the FCT, matching jobs ("Federal Capital Territory").
-- Status: NOT APPLIED. Profiles today: "Federal Capital Territory" 57, "Abuja" 22, "FCT" 17.
update public.profiles
   set state = 'Federal Capital Territory'
 where state in ('FCT', 'Abuja', 'F.C.T', 'F.C.T.', 'fct', 'abuja');
