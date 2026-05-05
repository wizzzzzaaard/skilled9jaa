"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MapPin, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo",
  "Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa",
  "Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba",
  "Yobe","Zamfara",
];

const LGA_BY_STATE: Record<string, string[]> = {
  // South East
  Abia: ["Aba North","Aba South","Arochukwu","Bende","Ikwuano","Isiala Ngwa North","Isiala Ngwa South","Isiukwuato","Obingwa","Ohafia","Osisioma","Ugwunagbo","Ukwa East","Ukwa West","Umuahia North","Umuahia South","Umu Nneochi"],
  Anambra: ["Aguata","Anambra East","Anambra West","Anaocha","Awka North","Awka South","Ayamelum","Dunukofia","Ekwusigo","Idemili North","Idemili South","Ihiala","Njikoka","Nnewi North","Nnewi South","Ogbaru","Onitsha North","Onitsha South","Orumba North","Orumba South","Oyi"],
  Ebonyi: ["Abakaliki","Afikpo North","Afikpo South","Ebonyi","Ezza North","Ezza South","Ikwo","Ishielu","Ivo","Izzi","Ohaozara","Ohaukwu","Onicha"],
  Enugu: ["Aninri","Awgu","Enugu East","Enugu North","Enugu South","Ezeagu","Igbo Etiti","Igbo Eze North","Igbo Eze South","Isi Uzo","Nkanu East","Nkanu West","Nsukka","Oji River","Udenu","Udi","Uzo Uwani"],
  Imo: ["Aboh Mbaise","Ahiazu Mbaise","Ehime Mbano","Ezinihitte","Ideato North","Ideato South","Ihitte/Uboma","Ikeduru","Isiala Mbano","Isu","Mbaitoli","Ngor Okpala","Njaba","Nkwerre","Nwangele","Obowo","Oguta","Ohaji/Egbema","Okigwe","Orlu","Orsu","Oru East","Oru West","Owerri Municipal","Owerri North","Owerri West","Unuimo"],

  // South South
  "Akwa Ibom": ["Abak","Eastern Obolo","Eket","Esit Eket","Essien Udim","Etim Ekpo","Etinan","Ibeno","Ibesikpo Asutan","Ibiono Ibom","Ika","Ikono","Ikot Abasi","Ikot Ekpene","Ini","Itu","Mbo","Mkpat Enin","Nsit Atai","Nsit Ibom","Nsit Ubium","Obot Akara","Okobo","Onna","Oron","Oruk Anam","Udung Uko","Ukanafun","Uruan","Urue Offong/Oruko","Uyo"],
  Bayelsa: ["Brass","Ekeremor","Kolokuma/Opokuma","Nembe","Ogbia","Sagbama","Southern Ijaw","Yenagoa"],
  "Cross River": ["Abi","Akamkpa","Akpabuyo","Bakassi","Bekwarra","Biase","Boki","Calabar Municipal","Calabar South","Etung","Ikom","Obanliku","Obubra","Obudu","Odukpani","Ogoja","Yakurr","Yala"],
  Delta: ["Aniocha North","Aniocha South","Bomadi","Burutu","Ethiope East","Ethiope West","Ika North East","Ika South","Isoko North","Isoko South","Ndokwa East","Ndokwa West","Okpe","Oshimili North","Oshimili South","Patani","Sapele","Udu","Ughelli North","Ughelli South","Ukwuani","Warri North","Warri South","Warri South West"],
  Edo: ["Akoko-Edo","Egor","Esan Central","Esan North-East","Esan South-East","Esan West","Etsako Central","Etsako East","Etsako West","Igueben","Ikpoba-Okha","Oredo","Orhionmwon","Ovia North-East","Ovia South-West","Owan East","Owan West","Uhunmwonde"],
  Rivers: ["Abua/Odual","Ahoada East","Ahoada West","Akuku-Toru","Andoni","Asari-Toru","Bonny","Degema","Eleme","Emohua","Etche","Gokana","Ikwerre","Khana","Obio/Akpor","Ogba/Egbema/Ndoni","Ogu/Bolo","Okrika","Omuma","Opobo/Nkoro","Oyigbo","Port Harcourt","Tai"],

  // South West
  Ekiti: ["Ado Ekiti","Efon","Ekiti East","Ekiti South-West","Ekiti West","Emure","Gbonyin","Ido/Osi","Ijero","Ikere","Ikole","Ilejemeje","Irepodun/Ifelodun","Ise/Orun","Moba","Oye"],
  Lagos: ["Agege","Ajeromi-Ifelodun","Alimosho","Amuwo-Odofin","Apapa","Badagry","Epe","Eti-Osa","Ibeju-Lekki","Ifako-Ijaiye","Ikeja","Ikorodu","Kosofe","Lagos Island","Lagos Mainland","Mushin","Ojo","Oshodi-Isolo","Shomolu","Surulere"],
  Ogun: ["Abeokuta North","Abeokuta South","Ado-Odo/Ota","Egbado North","Egbado South","Ewekoro","Ifo","Ijebu East","Ijebu North","Ijebu North East","Ijebu Ode","Ikenne","Imeko Afon","Ipokia","Obafemi Owode","Odogbolu","Odeda","Ogun Waterside","Remo North","Sagamu"],
  Ondo: ["Akoko North-East","Akoko North-West","Akoko South-East","Akoko South-West","Akure North","Akure South","Ese Odo","Idanre","Ifedore","Ilaje","Ile Oluji/Okeigbo","Irele","Odigbo","Okitipupa","Ondo East","Ondo West","Ose","Owo"],
  Osun: ["Aiyedaade","Aiyedire","Atakunmosa East","Atakunmosa West","Boluwaduro","Boripe","Ede North","Ede South","Egbedore","Ejigbo","Ife Central","Ife East","Ife North","Ife South","Ifedayo","Ifelodun","Ila","Ilesa East","Ilesa West","Irepodun","Irewole","Isokan","Iwo","Obokun","Odo Otin","Ola Oluwa","Olorunda","Oriade","Orolu","Osogbo"],
  Oyo: ["Afijio","Akinyele","Atiba","Atisbo","Egbeda","Ibadan North","Ibadan North-East","Ibadan North-West","Ibadan South-East","Ibadan South-West","Ibarapa Central","Ibarapa East","Ibarapa North","Ido","Irepo","Iseyin","Itesiwaju","Iwajowa","Kajola","Lagelu","Ogbomosho North","Ogbomosho South","Ogo Oluwa","Olorunsogo","Oluyole","Ona Ara","Orelope","Ori Ire","Oyo East","Oyo West","Saki East","Saki West","Surulere"],

  // North Central
  Benue: ["Ado","Agatu","Apa","Buruku","Gboko","Guma","Gwer East","Gwer West","Katsina-Ala","Konshisha","Kwande","Logo","Makurdi","Obi","Ogbadibo","Ohimini","Oju","Okpokwu","Otukpo","Tarka","Ukum","Ushongo","Vandeikya"],
  FCT: ["Abaji","Bwari","Gwagwalada","Kuje","Kwali","Municipal Area Council"],
  Kogi: ["Adavi","Ajaokuta","Ankpa","Bassa","Dekina","Ibaji","Idah","Igalamela Odolu","Ijumu","Kabba/Bunu","Kogi","Lokoja","Mopa-Muro","Ofu","Ogori/Magongo","Okehi","Okene","Olamaboro","Omala","Yagba East","Yagba West"],
  Kwara: ["Asa","Baruten","Edu","Ekiti","Ifelodun","Ilorin East","Ilorin South","Ilorin West","Irepodun","Isin","Kaiama","Moro","Offa","Oke Ero","Oyun","Patigi"],
  Nasarawa: ["Akwanga","Awe","Doma","Karu","Keana","Keffi","Kokona","Lafia","Nasarawa","Nasarawa Egon","Obi","Toto","Wamba"],
  Niger: ["Agaie","Agwara","Bida","Borgu","Bosso","Chanchaga","Edati","Gbako","Gurara","Katcha","Kontagora","Lapai","Lavun","Magama","Mariga","Mashegu","Mokwa","Munya","Paikoro","Rafi","Rijau","Shiroro","Suleja","Tafa","Wushishi"],
  Plateau: ["Barkin Ladi","Bassa","Bokkos","Jos East","Jos North","Jos South","Kanam","Kanke","Langtang North","Langtang South","Mangu","Mikang","Pankshin","Qua'an Pan","Riyom","Shendam","Wase"],

  // North East
  Adamawa: ["Demsa","Fufore","Ganye","Gayuk","Gombi","Grie","Hong","Jada","Lamurde","Madagali","Maiha","Mayo-Belwa","Michika","Mubi North","Mubi South","Numana","Shelleng","Song","Toungo","Yola North","Yola South"],
  Bauchi: ["Alkaleri","Bauchi","Bogoro","Damban","Darazo","Dass","Gamawa","Ganjuwa","Giade","Itas/Gadau","Jama'are","Katagum","Kirfi","Misau","Ningi","Shira","Tafawa Balewa","Toro","Warji","Zaki"],
  Borno: ["Abadam","Askira/Uba","Bama","Bayo","Biu","Chibok","Damboa","Dikwa","Gubio","Guzamala","Gwoza","Hawul","Jere","Kaga","Kala/Balge","Konduga","Kukawa","Kwaya Kusar","Mafa","Magumeri","Maiduguri","Marte","Mobbar","Monguno","Ngala","Nganzai","Shani"],
  Gombe: ["Akko","Balanga","Billiri","Dukku","Funakaye","Gombe","Kaltungo","Kwami","Nafada","Shongom","Yamaltu/Deba"],
  Taraba: ["Ardo Kola","Bali","Donga","Gashaka","Gassol","Ibi","Jalingo","Karim Lamido","Kurmi","Lau","Sardauna","Takum","Ussa","Wukari","Yorro","Zing"],
  Yobe: ["Bade","Bursari","Damaturu","Fika","Fune","Geidam","Gujba","Gulani","Jakusko","Karasuwa","Machina","Nangere","Nguru","Potiskum","Tarmuwa","Yunusari","Yusufari"],

  // North West
  Jigawa: ["Auyo","Babura","Biriniwa","Birnin Kudu","Buji","Dutse","Gagarawa","Garki","Gumel","Guri","Gwaram","Gwiwa","Hadejia","Jahun","Kafin Hausa","Kaugama","Kazaure","Kiri Kasama","Kiyawa","Maigatari","Malam Madori","Miga","Ringim","Roni","Sule Tankarkar","Taura","Yankwashi"],
  Kaduna: ["Birnin Gwari","Chikun","Giwa","Igabi","Ikara","Jaba","Jema'a","Kachia","Kaduna North","Kaduna South","Kagarko","Kajuru","Kaura","Kauru","Kubau","Kudan","Lere","Makarfi","Sabon Gari","Sanga","Soba","Zangon Kataf","Zaria"],
  Kano: ["Ajingi","Albasu","Bagwai","Bebeji","Bichi","Bunkure","Dala","Dambatta","Dawakin Kudu","Dawakin Tofa","Doguwa","Fagge","Gabasawa","Garko","Garun Mallam","Gaya","Gezawa","Gwale","Gwarzo","Kabo","Kano Municipal","Karaye","Kibiya","Kiru","Kumbotso","Kunchi","Kura","Madobi","Makoda","Minjibir","Nasarawa","Rano","Rimin Gado","Rogo","Shanono","Sumaila","Takai","Tarauni","Tofa","Tsanyawa","Tudun Wada","Ungogo","Warawa","Wudil"],
  Katsina: ["Bakori","Batagarawa","Batsari","Baure","Bindawa","Charanchi","Dan Musa","Dandume","Danja","Daura","Dutsi","Dutsin-Ma","Faskari","Funtua","Ingawa","Jibia","Kafur","Kaita","Kankara","Kankia","Katsina","Kurfi","Kusada","Mai'Adua","Malumfashi","Mani","Mashi","Matazu","Musawa","Rimi","Sabuwa","Safana","Sandamu","Zango"],
  Kebbi: ["Aleiro","Arewa Dandi","Argungu","Augie","Bagudo","Birnin Kebbi","Bunza","Dandi","Fakai","Gwandu","Jega","Kalgo","Koko/Besse","Maiyama","Ngaski","Sakaba","Shanga","Suru","Yauri","Zuru","Danko/Wasagu"],
  Sokoto: ["Binji","Bodinga","Dange Shuni","Gada","Goronyo","Gudu","Gwadabawa","Illela","Isa","Kebbe","Kware","Rabah","Sabon Birni","Shagari","Silame","Sokoto North","Sokoto South","Tambuwal","Tangaza","Tureta","Wamako","Yabo"],
  Zamfara: ["Anka","Bakura","Birnin Magaji/Kiyaw","Bukkuyum","Bungudu","Gummi","Gusau","Kaura Namoda","Maradun","Maru","Shinkafi","Talata Mafara","Tsafe","Zurmi"],
};

const CITIES_BY_STATE: Record<string, string[]> = {
  // South East
  Abia: ["Umuahia","Aba","Arochukwu","Ohafia","Bende","Isiukwuato","Osisioma"],
  Anambra: ["Awka","Onitsha","Nnewi","Ekwulobia","Ihiala","Ogbaru","Aguata"],
  Ebonyi: ["Abakaliki","Afikpo","Onicha","Ishielu","Izzi","Ohaukwu"],
  Enugu: ["Enugu","Nsukka","Oji River","Agbani","Awgu","Udi"],
  Imo: ["Owerri","Orlu","Okigwe","Oguta","Mbaise","Nkwerre"],

  // South South
  "Akwa Ibom": ["Uyo","Eket","Ikot Ekpene","Oron","Abak","Etinan","Ikot Abasi"],
  Bayelsa: ["Yenagoa","Brass","Ogbia","Sagbama","Ekeremor","Nembe"],
  "Cross River": ["Calabar","Ikom","Ogoja","Obudu","Ugep","Akamkpa"],
  Delta: ["Asaba","Warri","Sapele","Ughelli","Bomadi","Burutu","Agbor"],
  Edo: ["Benin City","Auchi","Ekpoma","Igarra","Uromi","Sabongida-Ora"],
  Rivers: ["Port Harcourt","Obio-Akpor","Eleme","Okrika","Bonny","Degema","Ahoada"],

  // South West
  Ekiti: ["Ado Ekiti","Ikere","Ijero","Oye","Ikole","Efon","Emure"],
  Lagos: ["Ikeja","Lekki","Victoria Island","Surulere","Yaba","Ikorodu","Badagry","Epe","Apapa","Mushin","Oshodi","Agege","Alimosho","Ajah","Sangotedo"],
  Ogun: ["Abeokuta","Ijebu Ode","Sagamu","Ilaro","Ota","Shagamu","Ifo","Aiyetoro"],
  Ondo: ["Akure","Ondo","Owo","Ikare","Okitipupa","Ile Oluji","Idanre"],
  Osun: ["Osogbo","Ilesa","Ede","Iwo","Ife","Ikire","Ila","Ejigbo"],
  Oyo: ["Ibadan","Ogbomosho","Oyo","Iseyin","Saki","Kisi","Igbo-Ora","Okeho"],

  // North Central
  Benue: ["Makurdi","Gboko","Otukpo","Katsina-Ala","Vandeikya","Oju","Logo"],
  FCT: ["Abuja","Garki","Wuse","Maitama","Asokoro","Gwarinpa","Kubwa","Nyanya","Karu","Lugbe"],
  Kogi: ["Lokoja","Okene","Idah","Kabba","Ankpa","Dekina","Ajaokuta"],
  Kwara: ["Ilorin","Offa","Kaiama","Jebba","Lafiagi","Patigi","Omu-Aran"],
  Nasarawa: ["Lafia","Keffi","Akwanga","Karu","Doma","Nasarawa","Wamba"],
  Niger: ["Minna","Bida","Suleja","Kontagora","Lapai","Mokwa","New Bussa"],
  Plateau: ["Jos","Barkin Ladi","Pankshin","Shendam","Mangu","Langtang","Bokkos"],

  // North East
  Adamawa: ["Yola","Mubi","Jimeta","Numan","Ganye","Michika","Mayo-Belwa","Gombi"],
  Bauchi: ["Bauchi","Azare","Jama'are","Misau","Ningi","Katagum","Tafawa Balewa"],
  Borno: ["Maiduguri","Biu","Bama","Monguno","Dikwa","Konduga","Gwoza","Mafa"],
  Gombe: ["Gombe","Kaltungo","Billiri","Dukku","Deba","Nafada","Kumo"],
  Taraba: ["Jalingo","Wukari","Takum","Bali","Sardauna","Zing","Ibi"],
  Yobe: ["Damaturu","Potiskum","Nguru","Gashua","Geidam","Bade","Gujba"],

  // North West
  Jigawa: ["Dutse","Hadejia","Kazaure","Gumel","Birnin Kudu","Ringim","Jahun"],
  Kaduna: ["Kaduna","Zaria","Kafanchan","Kagoro","Saminaka","Ikara","Jema'a"],
  Kano: ["Kano","Wudil","Gaya","Bichi","Rano","Karu","Dambatta","Gwarzo"],
  Katsina: ["Katsina","Daura","Funtua","Malumfashi","Kankia","Jibia","Dutsin-Ma"],
  Kebbi: ["Birnin Kebbi","Argungu","Yauri","Zuru","Jega","Koko","Bagudo"],
  Sokoto: ["Sokoto","Tambuwal","Wamako","Shagari","Goronyo","Isa","Dange Shuni"],
  Zamfara: ["Gusau","Kaura Namoda","Anka","Talata Mafara","Tsafe","Shinkafi","Maru"],
};

interface Props {
  bio: string; setBio: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  state: string; setState: (v: string) => void;
  city: string; setCity: (v: string) => void;
  lga: string; setLga: (v: string) => void;
  latitude: number | null; setLatitude: (v: number | null) => void;
  longitude: number | null; setLongitude: (v: number | null) => void;
  locating: boolean; handleUseMyLocation: () => void;
  isLoading: boolean;
  handleSetupSubmit: (e: React.FormEvent) => void;
  setStep: (s: any) => void;
  isArtisan: boolean; isHomeService: boolean; isPaidRole: boolean; isCompany: boolean;
  companyName: string; setCompanyName: (v: string) => void;
  industry: string; setIndustry: (v: string) => void;
  companyLocation: string; setCompanyLocation: (v: string) => void;
  userId: string | null;
  onProfileImageUploaded: (url: string) => void;
}

export function SetupStep({
  bio, setBio, phone, setPhone,
  state, setState, city, setCity, lga, setLga,
  latitude, setLatitude, longitude, setLongitude,
  locating, handleUseMyLocation,
  isLoading, handleSetupSubmit, setStep,
  isArtisan, isHomeService, isPaidRole, isCompany,
  companyName, setCompanyName, industry, setIndustry,
  companyLocation, setCompanyLocation,
  userId, onProfileImageUploaded,
}: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // City & LGA input mode toggles
  const [cityInputMode, setCityInputMode] = useState<"select" | "text">("select");
  const [lgaInputMode, setLgaInputMode] = useState<"select" | "text">("select");

  const availableCities = CITIES_BY_STATE[state] || [];
  const availableLgas = LGA_BY_STATE[state] || [];

  // Reset modes when state changes
  useEffect(() => {
    setCityInputMode("select");
    setLgaInputMode("select");
  }, [state]);

  // Auto-switch to text input if current value isn't in the list
  useEffect(() => {
    if (state && city && !availableCities.includes(city)) {
      setCityInputMode("text");
    }
  }, [state, city, availableCities]);

  useEffect(() => {
    if (state && lga && !availableLgas.includes(lga)) {
      setLgaInputMode("text");
    }
  }, [state, lga, availableLgas]);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploadError("");

    // Compress via canvas
    const compress = (f: File): Promise<Blob> =>
      new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(f);
        img.onload = () => {
          const MAX = 800;
          let { width, height } = img;
          if (width > MAX) { height = (height * MAX) / width; width = MAX; }
          const canvas = document.createElement("canvas");
          canvas.width = width; canvas.height = height;
          canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
          canvas.toBlob((b) => resolve(b!), "image/webp", 0.75);
          URL.revokeObjectURL(url);
        };
        img.src = url;
      });

    setUploading(true);
    try {
      const compressed = await compress(file);
      const path = `profiles/${userId}/avatar.webp`;
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("skilled-niger-assets")
        .upload(path, compressed, { upsert: true, contentType: "image/webp" });
      if (error) { setUploadError("Upload failed. Try again."); return; }
      const { data: { publicUrl } } = supabase.storage
        .from("skilled-niger-assets")
        .getPublicUrl(path);
      setImagePreview(publicUrl);
      onProfileImageUploaded(publicUrl);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-text-primary mb-1">Set up your profile</h2>
      <p className="text-sm text-text-secondary mb-4">Help clients know who you are and how to reach you.</p>

      <form onSubmit={handleSetupSubmit} className="space-y-4">

        {/* Profile Picture */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">Profile Photo</label>
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer"
              onClick={() => fileRef.current?.click()}
            >
              {imagePreview
                ? <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                : <Upload className="w-5 h-5 text-gray-400" />
              }
            </div>
            <div className="flex-1">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="text-sm text-primary font-medium hover:underline disabled:opacity-50"
              >
                {uploading ? "Uploading..." : imagePreview ? "Change photo" : "Upload photo"}
              </button>
              <p className="text-xs text-text-secondary mt-0.5">JPG, PNG or WebP. Auto-compressed.</p>
              {uploadError && <p className="text-xs text-red-500 mt-0.5">{uploadError}</p>}
            </div>
            {imagePreview && (
              <button type="button" onClick={() => { setImagePreview(null); onProfileImageUploaded(""); }}>
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Bio — tell clients what you do</label>
          <textarea
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-text-primary placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            rows={3}
            placeholder="e.g. Experienced electrician with 5 years handling residential and commercial installations across Lagos."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Phone Number</label>
          <Input placeholder="09785564288" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>

        {/* Company fields */}
        {isCompany && (
          <div className="space-y-3 p-3 bg-surface rounded-xl border border-gray-100">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Company Details</p>
            <Input label="Company Name" placeholder="e.g. Okeke & Sons Ltd" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
            <Input label="Industry" placeholder="e.g. Construction, Tech, Healthcare" value={industry} onChange={(e) => setIndustry(e.target.value)} />
            <Input label="Company Location" placeholder="e.g. Victoria Island, Lagos" value={companyLocation} onChange={(e) => setCompanyLocation(e.target.value)} />
          </div>
        )}

        {/* State dropdown */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">State</label>
          <select
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            value={state}
            onChange={(e) => { setState(e.target.value); setCity(""); setLga(""); }}
            required
          >
            <option value="">Select state</option>
            {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* City: Select or Manual Input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-text-primary">City</label>
            {state && availableCities.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setCityInputMode((prev) => (prev === "select" ? "text" : "select"));
                  if (cityInputMode === "text") setCity("");
                }}
                className="text-xs text-primary font-medium hover:underline"
              >
                {cityInputMode === "select" ? "Type manually instead" : "Choose from list"}
              </button>
            )}
          </div>

          {state && availableCities.length > 0 && cityInputMode === "select" ? (
            <select
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              <option value="">Select city</option>
              {availableCities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          ) : (
            <Input
              placeholder={state ? "Enter your city" : "Select a state first"}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={!state}
            />
          )}
        </div>

        {/* LGA: Select or Manual Input */}
        {state && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-text-primary">LGA</label>
              {availableLgas.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setLgaInputMode((prev) => (prev === "select" ? "text" : "select"));
                    if (lgaInputMode === "text") setLga("");
                  }}
                  className="text-xs text-primary font-medium hover:underline"
                >
                  {lgaInputMode === "select" ? "Type manually instead" : "Choose from list"}
                </button>
              )}
            </div>

            {availableLgas.length > 0 && lgaInputMode === "select" ? (
              <select
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                value={lga}
                onChange={(e) => setLga(e.target.value)}
              >
                <option value="">Select LGA</option>
                {availableLgas.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            ) : (
              <Input
                placeholder="Enter your LGA"
                value={lga}
                onChange={(e) => setLga(e.target.value)}
              />
            )}
          </div>
        )}

        {/* Socials */}
        <div>
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Social & Contact Links</p>
          <div className="space-y-3">
            <Input placeholder="WhatsApp URL — https://wa.me/2348012345678" />
            <Input placeholder="Instagram — @username" />
            <Input placeholder="Twitter — @username" />
            <Input placeholder="LinkedIn URL" />
          </div>
        </div>

        {/* Map */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">Pin your location</label>
          {latitude && longitude ? (
            <div className="rounded-xl overflow-hidden border border-gray-200 mb-2">
              <iframe
                width="100%"
                height="200"
                frameBorder="0"
                scrolling="no"
                src={`https://maps.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`}
              />
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-gray-200 h-32 flex items-center justify-center mb-2 text-sm text-text-secondary">
              Use button below to pin your location
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 mb-2">
            <Input
              placeholder="Latitude" type="number" step="any"
              value={latitude ?? ""}
              onChange={(e) => setLatitude(e.target.value ? parseFloat(e.target.value) : null)}
            />
            <Input
              placeholder="Longitude" type="number" step="any"
              value={longitude ?? ""}
              onChange={(e) => setLongitude(e.target.value ? parseFloat(e.target.value) : null)}
            />
          </div>
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={locating}
            className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline disabled:opacity-50"
          >
            <MapPin className="w-3.5 h-3.5" />
            {locating ? "Locating..." : "Use my location"}
          </button>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("role")}>Back</Button>
          <Button type="submit" variant="primary" className="flex-1" isLoading={isLoading}>
            {isArtisan ? "Continue to Skills" : isPaidRole ? "Continue to Payment" : "Finish"}
          </Button>
        </div>

        <button
          type="button"
          className="w-full text-center text-sm text-text-secondary hover:text-text-primary transition-colors"
          onClick={() => {
            if (isArtisan) setStep("skills");
            else if (isHomeService) setStep("hs_services");
            else if (isPaidRole) setStep("payment");
            else router.push("/dashboard");
          }}
        >
          Skip for now
        </button>
      </form>
    </div>
  );
}