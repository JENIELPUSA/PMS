export const Footer = () => {
    return (
        <footer className="w-full bg-[#003366] border-t-4 border-[#FFD700] py-4 text-center">
            <p className="text-blue-100 text-xs">
                © {new Date().getFullYear()}{" "}
                <span className="text-[#FFD700] font-semibold">
                    Biliran Province State University
                </span>
            </p>
            <p className="text-blue-300 text-[10px] mt-1 tracking-widest uppercase">
                Committed to Excellence and Service
            </p>
        </footer>
    );
};